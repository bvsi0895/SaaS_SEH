import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EstadoRelacionEmpresa,
  EstadoSuscripcionSaaS,
  EventoSuscripcionSaaS,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TRIAL_DAYS = 15;
type TransactionClient = Prisma.TransactionClient;

export interface SubscriptionStatus {
  id: string;
  organizacionId: string;
  estado: EstadoSuscripcionSaaS;
  estadoEfectivo: EstadoSuscripcionSaaS;
  inicio: Date;
  finPeriodo: Date | null;
  pruebaFinalizaEn: Date | null;
  motivo: string | null;
  plan: { id: string; codigo: string; nombre: string; maxUsuarios: number; maxEmpresas: number };
}

@Injectable()
export class SaasCommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getTrialDays(requested?: number) {
    const configured = Number(this.config.get<string>('SAAS_TRIAL_DAYS') || DEFAULT_TRIAL_DAYS);
    const days = requested ?? configured;
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new ConflictException('El período de prueba debe estar entre 1 y 365 días');
    }
    return days;
  }

  private effectiveState(subscription: { estado: EstadoSuscripcionSaaS; finPeriodo: Date | null; pruebaFinalizaEn: Date | null }) {
    const now = Date.now();
    if (subscription.estado === EstadoSuscripcionSaaS.TRIAL && subscription.pruebaFinalizaEn && subscription.pruebaFinalizaEn.getTime() <= now) {
      return EstadoSuscripcionSaaS.VENCIDA;
    }
    if (subscription.estado === EstadoSuscripcionSaaS.ACTIVA && subscription.finPeriodo && subscription.finPeriodo.getTime() <= now) {
      return EstadoSuscripcionSaaS.VENCIDA;
    }
    return subscription.estado;
  }

  private toStatus(subscription: any): SubscriptionStatus {
    return {
      id: subscription.id,
      organizacionId: subscription.organizacionId,
      estado: subscription.estado,
      estadoEfectivo: this.effectiveState(subscription),
      inicio: subscription.inicio,
      finPeriodo: subscription.finPeriodo,
      pruebaFinalizaEn: subscription.pruebaFinalizaEn,
      motivo: subscription.motivo,
      plan: subscription.plan,
    };
  }

  async assertOperationalAccess(organizacionId: string) {
    const subscription = await this.prisma.suscripcionSaaS.findUnique({
      where: { organizacionId },
      include: { plan: true },
    });
    if (!subscription) throw new ForbiddenException('La organización no tiene una suscripción comercial activa');
    const state = this.effectiveState(subscription);
    const blockedStates: EstadoSuscripcionSaaS[] = [
      EstadoSuscripcionSaaS.SUSPENDIDA,
      EstadoSuscripcionSaaS.VENCIDA,
      EstadoSuscripcionSaaS.CANCELADA,
    ];
    if (!subscription.plan.activo || blockedStates.includes(state)) {
      throw new ForbiddenException('La cuenta comercial no habilita operaciones; regularice la suscripción');
    }
    return this.toStatus(subscription);
  }

  async getOrganizationStatus(organizacionId: string) {
    const subscription = await this.prisma.suscripcionSaaS.findUnique({
      where: { organizacionId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('La organización no tiene una suscripción comercial');
    return this.toStatus(subscription);
  }

  async listOrganizations() {
    const organizations = await this.prisma.organizacion.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        suscripcionSaaS: { include: { plan: true } },
        _count: { select: { miembros: true, empresas: true } },
      },
    });
    return organizations.map((organization) => ({
      id: organization.id,
      nombre: organization.nombre,
      tipo: organization.tipo,
      activa: organization.activa,
      miembros: organization._count.miembros,
      empresas: organization._count.empresas,
      suscripcion: organization.suscripcionSaaS ? this.toStatus(organization.suscripcionSaaS) : null,
    }));
  }

  async listPlans() {
    return this.prisma.planSaaS.findMany({ where: { activo: true }, orderBy: { maxEmpresas: 'asc' } });
  }

  private async findPlan(tx: PrismaService | TransactionClient, planId?: string) {
    const plan = planId
      ? await tx.planSaaS.findFirst({ where: { id: planId, activo: true } })
      : await tx.planSaaS.findFirst({ where: { codigo: 'DEMO_15_DIAS', activo: true } });
    if (!plan) throw new NotFoundException('Plan SaaS no encontrado o inactivo');
    return plan;
  }

  private async audit(
    tx: TransactionClient,
    subscription: { id: string; organizacionId: string; estado: EstadoSuscripcionSaaS; planId: string },
    event: EventoSuscripcionSaaS,
    actorUsuarioId: string,
    data: { estadoNuevo?: EstadoSuscripcionSaaS; planNuevoId?: string; motivo?: string },
  ) {
    await tx.auditoriaSuscripcionSaaS.create({
      data: {
        id: randomUUID(),
        suscripcionId: subscription.id,
        organizacionId: subscription.organizacionId,
        actorUsuarioId,
        evento: event,
        estadoAnterior: subscription.estado,
        estadoNuevo: data.estadoNuevo,
        planAnteriorId: subscription.planId,
        planNuevoId: data.planNuevoId,
        motivo: data.motivo,
      },
    });
  }

  async startTrial(organizacionId: string, actorUsuarioId: string, planId?: string, requestedDays?: number) {
    const days = this.getTrialDays(requestedDays);
    return this.prisma.$transaction(async (tx) => {
      const plan = await this.findPlan(tx, planId);
      const current = await tx.suscripcionSaaS.findUnique({ where: { organizacionId } });
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const subscription = current
        ? await tx.suscripcionSaaS.update({
            where: { organizacionId },
            data: { planId: plan.id, estado: EstadoSuscripcionSaaS.TRIAL, inicio: now, pruebaFinalizaEn: end, finPeriodo: null, suspendidaEn: null, canceladaEn: null, motivo: null },
            include: { plan: true },
          })
        : await tx.suscripcionSaaS.create({
            data: { id: randomUUID(), organizacionId, planId: plan.id, estado: EstadoSuscripcionSaaS.TRIAL, inicio: now, pruebaFinalizaEn: end },
            include: { plan: true },
          });
      await this.audit(tx, current || subscription, EventoSuscripcionSaaS.CREADA, actorUsuarioId, { estadoNuevo: EstadoSuscripcionSaaS.TRIAL, planNuevoId: plan.id, motivo: `${days} días de prueba` });
      return this.toStatus(subscription);
    });
  }

  async activate(organizacionId: string, actorUsuarioId: string, planId?: string, finPeriodo?: Date) {
    return this.transition(organizacionId, actorUsuarioId, EstadoSuscripcionSaaS.ACTIVA, EventoSuscripcionSaaS.ACTIVADA, planId, finPeriodo);
  }

  async suspend(organizacionId: string, actorUsuarioId: string, motivo?: string) {
    return this.transition(organizacionId, actorUsuarioId, EstadoSuscripcionSaaS.SUSPENDIDA, EventoSuscripcionSaaS.SUSPENDIDA, undefined, undefined, motivo);
  }

  async cancel(organizacionId: string, actorUsuarioId: string, motivo?: string) {
    return this.transition(organizacionId, actorUsuarioId, EstadoSuscripcionSaaS.CANCELADA, EventoSuscripcionSaaS.CANCELADA, undefined, undefined, motivo);
  }

  private async transition(
    organizacionId: string,
    actorUsuarioId: string,
    state: EstadoSuscripcionSaaS,
    event: EventoSuscripcionSaaS,
    planId?: string,
    finPeriodo?: Date,
    motivo?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.suscripcionSaaS.findUnique({ where: { organizacionId } });
      if (!current) throw new NotFoundException('La organización no tiene una suscripción comercial');
      const plan = await this.findPlan(tx, planId || current.planId);
      const subscription = await tx.suscripcionSaaS.update({
        where: { organizacionId },
        data: {
          estado: state,
          planId: plan.id,
          finPeriodo: state === EstadoSuscripcionSaaS.ACTIVA ? finPeriodo ?? null : current.finPeriodo,
          suspendidaEn: state === EstadoSuscripcionSaaS.SUSPENDIDA ? new Date() : null,
          canceladaEn: state === EstadoSuscripcionSaaS.CANCELADA ? new Date() : null,
          motivo: motivo || null,
        },
        include: { plan: true },
      });
      await this.audit(tx, current, current.estado === state && current.planId !== plan.id ? EventoSuscripcionSaaS.PLAN_CAMBIADO : event, actorUsuarioId, { estadoNuevo: state, planNuevoId: plan.id, motivo });
      return this.toStatus(subscription);
    });
  }

  async listAudit(organizacionId: string) {
    return this.prisma.auditoriaSuscripcionSaaS.findMany({
      where: { organizacionId },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
  }

  async assertCapacityInTransaction(tx: TransactionClient, organizacionId: string, resource: 'usuarios' | 'empresas') {
    // Bloqueo transaccional por organización: dos altas concurrentes no pueden
    // observar el mismo cupo libre y superarlo simultáneamente.
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${organizacionId}, 0))`);
    const subscription = await tx.suscripcionSaaS.findUnique({ where: { organizacionId }, include: { plan: true } });
    if (!subscription) throw new ForbiddenException('La organización no tiene una suscripción comercial');
    const state = this.effectiveState(subscription);
    const blockedStates: EstadoSuscripcionSaaS[] = [
      EstadoSuscripcionSaaS.SUSPENDIDA,
      EstadoSuscripcionSaaS.VENCIDA,
      EstadoSuscripcionSaaS.CANCELADA,
    ];
    if (blockedStates.includes(state) || !subscription.plan.activo) {
      throw new ForbiddenException('La cuenta comercial no permite nuevas altas');
    }
    const count = resource === 'usuarios'
      ? await tx.organizacionMiembro.count({ where: { organizacionId, activa: true } })
      : await tx.organizacionEmpresa.count({ where: { organizacionId, estado: EstadoRelacionEmpresa.ACTIVA } });
    const limit = resource === 'usuarios' ? subscription.plan.maxUsuarios : subscription.plan.maxEmpresas;
    if (count >= limit) throw new ConflictException(`El plan alcanzó el límite de ${resource}: ${limit}`);
  }
}

