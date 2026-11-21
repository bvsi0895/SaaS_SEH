import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInspeccionDto,
  RegistrarItemDto,
  UpdateInspeccionDto,
  FinalizarInspeccionDto,
  ReasignarInspeccionDto,
} from './dto';
import { EstadoHallazgo, EstadoInspeccion, CumplimientoItem, Rol, EstadoRelacionEmpresa } from '@prisma/client';
import { TenancyService } from '../tenancy/tenancy.service';

@Injectable()
export class InspeccionesService {
  constructor(private prisma: PrismaService, @Optional() private tenancy?: TenancyService) {}

  private readonly listInclude = {
    checklist: { select: { id: true, nombre: true, tipo: true } },
    establecimiento: { select: { id: true, nombre: true, codigo: true } },
    creadoPor: { select: { id: true, nombre: true, apellido: true, email: true } },
    asignadoA: { select: { id: true, nombre: true, apellido: true, email: true, rol: true } },
    usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
    _count: { select: { items: true, hallazgos: true } },
  } as const;

  private readonly detailInclude = {
    checklist: { include: { items: { orderBy: { orden: 'asc' as const } } } },
    establecimiento: { select: { id: true, nombre: true, codigo: true } },
    creadoPor: { select: { id: true, nombre: true, apellido: true, email: true } },
    asignadoA: { select: { id: true, nombre: true, apellido: true, email: true, rol: true } },
    usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
    items: {
      include: { checklistItem: true },
      orderBy: { checklistItem: { orden: 'asc' as const } },
    },
    hallazgos: {
      include: {
        accionesCorrectivas: {
          select: { id: true, descripcion: true, estado: true, responsableId: true, fechaCompromiso: true },
        },
      },
    },
    reasignaciones: {
      orderBy: { createdAt: 'desc' as const },
      include: {
        desdeUsuario: { select: { id: true, nombre: true, apellido: true } },
        haciaUsuario: { select: { id: true, nombre: true, apellido: true } },
        efectuadaPor: { select: { id: true, nombre: true, apellido: true } },
      },
    },
  } as const;

  private isTechnician(role?: Rol) {
    return role === Rol.TECNICO;
  }

  private async assertAuthorizedAssignee(usuarioId: string, empresaId: string, organizacionEmpresaId?: string, establecimientoId?: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId,
        rol: Rol.TECNICO,
        activo: true,
        ...(organizacionEmpresaId && {
          membresiasOrganizacion: {
            some: {
              activa: true,
              accesosEmpresa: {
                some: {
                  empresaId,
                  organizacionEmpresaId,
                  activo: true,
                  organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                  ...(establecimientoId && { establecimientos: { some: { establecimientoId } } }),
                },
              },
            },
          },
        }),
      },
      select: { id: true },
    });
    if (!usuario) throw new ForbiddenException('El responsable no está autorizado para esta empresa y organización');
  }

  private async establishmentFilter(empresaId: string, organizacionEmpresaId: string | undefined, establecimientoId: string | undefined, accesoEmpresaId?: string) {
    if (!this.tenancy || !accesoEmpresaId) return establecimientoId ? { establecimientoId } : {};
    const scope = await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId, organizacionEmpresaId);
    if (establecimientoId && scope !== undefined && !scope.includes(establecimientoId)) throw new NotFoundException('Establecimiento no encontrado');
    if (establecimientoId) return { establecimientoId };
    return scope === undefined ? {} : { establecimientoId: { in: scope } };
  }

  private async assertEstablishmentAccess(establecimientoId: string, empresaId: string, organizacionEmpresaId: string | undefined, accesoEmpresaId: string | undefined) {
    if (!this.tenancy || !accesoEmpresaId) return;
    const establishment = await this.prisma.establecimiento.findFirst({ where: { id: establecimientoId, empresaId, activo: true } });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    const scope = await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId, organizacionEmpresaId);
    if (scope !== undefined && !scope.includes(establecimientoId)) throw new NotFoundException('Establecimiento no encontrado');
  }

  private assertCanAccess(inspeccion: any, usuarioId?: string, currentUserRole?: Rol) {
    if (this.isTechnician(currentUserRole) || usuarioId) {
      const assignedId = inspeccion.asignadoAId ?? inspeccion.usuarioId;
      if (assignedId !== usuarioId) throw new NotFoundException('Inspección no encontrada');
    }
  }

  async findAll(
    empresaId: string,
    filters?: {
      estado?: EstadoInspeccion;
      usuarioId?: string;
      asignadoAId?: string;
      checklistId?: string;
      sector?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      establecimientoId?: string;
    },
    organizacionEmpresaId?: string,
    currentUserRole?: Rol,
    currentUserId?: string,
    accesoEmpresaId?: string,
  ) {
    const assignedId = this.isTechnician(currentUserRole) ? currentUserId : filters?.asignadoAId || filters?.usuarioId;
    const establishmentFilter = await this.establishmentFilter(empresaId, organizacionEmpresaId, filters?.establecimientoId, accesoEmpresaId);
    return this.prisma.inspeccion.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(this.isTechnician(currentUserRole) && { asignadoAId: currentUserId }),
        ...(filters?.estado && { estado: filters.estado }),
        ...(assignedId && { asignadoAId: assignedId }),
        ...(filters?.checklistId && { checklistId: filters.checklistId }),
        ...(filters?.sector && { sector: { contains: filters.sector, mode: 'insensitive' } }),
        ...(filters?.fechaDesde && { fechaHoraInicio: { gte: filters.fechaDesde } }),
        ...(filters?.fechaHasta && { fechaHoraInicio: { lte: filters.fechaHasta } }),
        ...establishmentFilter,
      },
      include: this.listInclude,
      orderBy: [{ fechaProgramada: 'asc' }, { fechaHoraInicio: 'desc' }],
    });
  }

  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.prisma.inspeccion.findUnique({ where: { id }, include: this.detailInclude });
    if (!inspeccion) throw new NotFoundException('Inspección no encontrada');
    if (empresaId && inspeccion.empresaId !== empresaId) throw new NotFoundException('Inspección no encontrada');
    if (organizacionEmpresaId && inspeccion.organizacionEmpresaId !== organizacionEmpresaId) throw new NotFoundException('Inspección no encontrada');
    this.assertCanAccess(inspeccion, usuarioId, currentUserRole);
    if (currentUserRole === Rol.TECNICO && empresaId && inspeccion.establecimientoId) await this.assertEstablishmentAccess(inspeccion.establecimientoId, empresaId, organizacionEmpresaId, accesoEmpresaId);
    if (currentUserRole === Rol.TECNICO && !inspeccion.establecimientoId) throw new NotFoundException('Inspección no encontrada');
    return inspeccion;
  }

  async create(dto: CreateInspeccionDto, usuarioId: string, empresaId: string, organizacionEmpresaId?: string, currentUserRole: Rol = Rol.TECNICO, accesoEmpresaId?: string) {
    await this.assertEstablishmentAccess(dto.establecimientoId, empresaId, organizacionEmpresaId, accesoEmpresaId);
    const checklist = await this.prisma.checklist.findUnique({ where: { id: dto.checklistId }, include: { items: { orderBy: { orden: 'asc' } } } });
    if (!checklist) throw new NotFoundException('Checklist no encontrado');
    if (!checklist.activo) throw new BadRequestException('El checklist está desactivado');
    if (checklist.empresaId !== empresaId) throw new ForbiddenException('No tiene acceso a este checklist');
    if (organizacionEmpresaId && checklist.organizacionEmpresaId !== organizacionEmpresaId) throw new ForbiddenException('No tiene acceso a este checklist');
    if (checklist.items.length === 0) throw new BadRequestException('El checklist no tiene items');

    const asignadoAId = dto.asignadoAId || usuarioId;
    if (this.isTechnician(currentUserRole) && asignadoAId !== usuarioId) throw new ForbiddenException('Un técnico solo puede crear inspecciones propias');
    if (asignadoAId !== usuarioId) await this.assertAuthorizedAssignee(asignadoAId, empresaId, organizacionEmpresaId, dto.establecimientoId);

    const estado = asignadoAId === usuarioId ? EstadoInspeccion.EN_PROGRESO : EstadoInspeccion.PENDIENTE;
    return this.prisma.inspeccion.create({
      data: {
        checklistId: dto.checklistId,
        creadoPorId: usuarioId,
        asignadoAId,
        usuarioId: asignadoAId,
        empresaId,
        organizacionEmpresaId,
        sector: dto.sector,
        establecimientoId: dto.establecimientoId,
        descripcion: dto.descripcion,
        fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined,
        fechaHoraInicio: estado === EstadoInspeccion.EN_PROGRESO ? new Date() : null,
        ubicacionTexto: dto.ubicacionTexto,
        latitud: dto.latitud,
        longitud: dto.longitud,
        estado,
        items: { create: checklist.items.map((item) => ({ checklistItemId: item.id, cumplimiento: CumplimientoItem.PENDIENTE })) },
      },
      include: { ...this.listInclude, items: { include: { checklistItem: true }, orderBy: { checklistItem: { orden: 'asc' as const } } } },
    });
  }

  async iniciar(id: string, empresaId: string, organizacionEmpresaId: string, usuarioId: string, currentUserRole: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE) throw new BadRequestException('Solo se pueden iniciar inspecciones pendientes');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.EN_PROGRESO, fechaHoraInicio: new Date(), fechaHoraFin: null }, include: this.listInclude });
  }

  async reasignar(id: string, dto: ReasignarInspeccionDto, empresaId: string, organizacionEmpresaId: string, efectuadoPorId: string, currentUserRole: Rol, accesoEmpresaId?: string) {
    if (currentUserRole !== Rol.ADMIN_EMPRESA && currentUserRole !== Rol.SUPERVISOR) throw new ForbiddenException('Solo administradores y supervisores pueden reasignar inspecciones');
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, undefined, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE) throw new BadRequestException('Solo se pueden reasignar inspecciones pendientes');
    await this.assertAuthorizedAssignee(dto.asignadoAId, empresaId, organizacionEmpresaId, inspeccion.establecimientoId || undefined);
    if (dto.asignadoAId === inspeccion.asignadoAId) throw new BadRequestException('La inspección ya está asignada a ese técnico');
    return this.prisma.$transaction(async (tx) => {
      await tx.inspeccionReasignacion.create({ data: { inspeccionId: id, desdeUsuarioId: inspeccion.asignadoAId, haciaUsuarioId: dto.asignadoAId, efectuadaPorId: efectuadoPorId } });
      return tx.inspeccion.update({ where: { id }, data: { asignadoAId: dto.asignadoAId, usuarioId: dto.asignadoAId }, include: this.listInclude });
    });
  }

  async registrarItem(id: string, dto: RegistrarItemDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('La inspección no está en progreso');
    if (!inspeccion.items.some((item) => item.id === dto.inspeccionItemId)) throw new NotFoundException('Item no encontrado en esta inspección');
    await this.assertNoOpenFindingBeforeCompliance(inspeccion.id, [{ inspeccionItemId: dto.inspeccionItemId, cumplimiento: dto.cumplimiento }]);
    return this.prisma.inspeccionItem.update({ where: { id: dto.inspeccionItemId }, data: { cumplimiento: dto.cumplimiento, observacion: dto.observacion }, include: { checklistItem: true } });
  }

  async registrarMultiplesItems(id: string, items: RegistrarItemDto[], empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('La inspección no está en progreso');
    if (items.some((item) => !inspeccion.items.some((existing) => existing.id === item.inspeccionItemId))) throw new NotFoundException('Uno de los items no pertenece a esta inspección');
    await this.assertNoOpenFindingBeforeCompliance(inspeccion.id, items);
    await this.prisma.$transaction(items.map((item) => this.prisma.inspeccionItem.update({ where: { id: item.inspeccionItemId }, data: { cumplimiento: item.cumplimiento, observacion: item.observacion } })));
    return this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
  }

  private async assertNoOpenFindingBeforeCompliance(inspeccionId: string, items: Array<{ inspeccionItemId: string; cumplimiento: CumplimientoItem }>) {
    const itemIds = items.filter((item) => item.cumplimiento === CumplimientoItem.CUMPLE).map((item) => item.inspeccionItemId);
    if (itemIds.length === 0) return;
    // Keeps isolated unit callers that provide only the inspection mock backward compatible;
    // the real Prisma client always exposes this delegate.
    if (!this.prisma.hallazgo?.findMany) return;
    const findings = await this.prisma.hallazgo.findMany({
      where: {
        inspeccionId,
        inspeccionItemId: { in: itemIds },
        estado: { not: EstadoHallazgo.SOLUCIONADO },
      },
      select: { id: true, titulo: true, estado: true, inspeccionItemId: true },
    });
    if (findings.length > 0) {
      throw new ConflictException({
        code: 'OPEN_FINDING_REQUIRES_RESOLUTION',
        message: 'El ítem tiene un hallazgo abierto. Registre y verifique su resolución antes de cambiarlo a Cumple.',
        findings,
      });
    }
  }

  async update(id: string, dto: UpdateInspeccionDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('No se puede editar una inspección que no está en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: dto, include: this.listInclude });
  }

  async finalizar(id: string, dto: FinalizarInspeccionDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('Solo se pueden finalizar inspecciones en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.COMPLETADA, fechaHoraFin: new Date(), observaciones: dto.observaciones }, include: this.detailInclude });
  }

  async cancelar(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE && inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('Solo se pueden cancelar inspecciones pendientes o en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.CANCELADA, fechaHoraFin: new Date() }, include: this.listInclude });
  }

  async getResumen(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol, accesoEmpresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole, accesoEmpresaId);
    const itemsCumplen = inspeccion.items.filter((i) => i.cumplimiento === CumplimientoItem.CUMPLE).length;
    const itemsNoCumplen = inspeccion.items.filter((i) => i.cumplimiento === CumplimientoItem.NO_CUMPLE).length;
    const itemsNoAplica = inspeccion.items.filter((i) => i.cumplimiento === CumplimientoItem.NO_APLICA).length;
    const itemsObservacion = inspeccion.items.filter((i) => i.cumplimiento === CumplimientoItem.OBSERVACION).length;
    const totalItems = inspeccion.items.length;
    const itemsEvaluables = totalItems - itemsNoAplica;
    const asignado = inspeccion.asignadoA ?? inspeccion.usuario;
    return {
      id: inspeccion.id,
      sector: inspeccion.sector,
      estado: inspeccion.estado,
      fechaInicio: inspeccion.fechaHoraInicio,
      fechaFin: inspeccion.fechaHoraFin,
      checklist: inspeccion.checklist.nombre,
      tecnico: `${asignado.nombre} ${asignado.apellido}`,
      resumen: { totalItems, itemsCumplen, itemsNoCumplen, itemsNoAplica, itemsObservacion, porcentajeCumplimiento: itemsEvaluables > 0 ? Math.round((itemsCumplen / itemsEvaluables) * 100) : 0 },
      hallazgos: {
        total: inspeccion.hallazgos.length,
        porNivel: {
          CRITICO: inspeccion.hallazgos.filter((h) => h.nivelRiesgo === 'CRITICO').length,
          ALTO: inspeccion.hallazgos.filter((h) => h.nivelRiesgo === 'ALTO').length,
          MEDIO: inspeccion.hallazgos.filter((h) => h.nivelRiesgo === 'MEDIO').length,
          BAJO: inspeccion.hallazgos.filter((h) => h.nivelRiesgo === 'BAJO').length,
        },
      },
    };
  }

  async findMine(usuarioId: string, empresaId: string, filters?: { estado?: EstadoInspeccion; establecimientoId?: string }, organizacionEmpresaId?: string, accesoEmpresaId?: string) {
    const establishmentFilter = await this.establishmentFilter(empresaId, organizacionEmpresaId, filters?.establecimientoId, accesoEmpresaId);
    return this.prisma.inspeccion.findMany({ where: { asignadoAId: usuarioId, empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...(filters?.estado && { estado: filters.estado }), ...establishmentFilter }, include: this.listInclude, orderBy: [{ fechaProgramada: 'asc' }, { fechaHoraInicio: 'desc' }] });
  }
}

