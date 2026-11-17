import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInspeccionDto,
  RegistrarItemDto,
  UpdateInspeccionDto,
  FinalizarInspeccionDto,
  ReasignarInspeccionDto,
} from './dto';
import { EstadoInspeccion, CumplimientoItem, Rol, EstadoRelacionEmpresa } from '@prisma/client';

@Injectable()
export class InspeccionesService {
  constructor(private prisma: PrismaService) {}

  private readonly listInclude = {
    checklist: { select: { id: true, nombre: true, tipo: true } },
    creadoPor: { select: { id: true, nombre: true, apellido: true, email: true } },
    asignadoA: { select: { id: true, nombre: true, apellido: true, email: true, rol: true } },
    usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
    _count: { select: { items: true, hallazgos: true } },
  } as const;

  private readonly detailInclude = {
    checklist: { include: { items: { orderBy: { orden: 'asc' as const } } } },
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

  private async assertAuthorizedAssignee(usuarioId: string, empresaId: string, organizacionEmpresaId?: string) {
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
    },
    organizacionEmpresaId?: string,
    currentUserRole?: Rol,
    currentUserId?: string,
  ) {
    const assignedId = this.isTechnician(currentUserRole) ? currentUserId : filters?.asignadoAId || filters?.usuarioId;
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
      },
      include: this.listInclude,
      orderBy: [{ fechaProgramada: 'asc' }, { fechaHoraInicio: 'desc' }],
    });
  }

  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.prisma.inspeccion.findUnique({ where: { id }, include: this.detailInclude });
    if (!inspeccion) throw new NotFoundException('Inspección no encontrada');
    if (empresaId && inspeccion.empresaId !== empresaId) throw new NotFoundException('Inspección no encontrada');
    if (organizacionEmpresaId && inspeccion.organizacionEmpresaId !== organizacionEmpresaId) throw new NotFoundException('Inspección no encontrada');
    this.assertCanAccess(inspeccion, usuarioId, currentUserRole);
    return inspeccion;
  }

  async create(dto: CreateInspeccionDto, usuarioId: string, empresaId: string, organizacionEmpresaId?: string, currentUserRole: Rol = Rol.TECNICO) {
    const checklist = await this.prisma.checklist.findUnique({ where: { id: dto.checklistId }, include: { items: { orderBy: { orden: 'asc' } } } });
    if (!checklist) throw new NotFoundException('Checklist no encontrado');
    if (!checklist.activo) throw new BadRequestException('El checklist está desactivado');
    if (checklist.empresaId !== empresaId) throw new ForbiddenException('No tiene acceso a este checklist');
    if (organizacionEmpresaId && checklist.organizacionEmpresaId !== organizacionEmpresaId) throw new ForbiddenException('No tiene acceso a este checklist');
    if (checklist.items.length === 0) throw new BadRequestException('El checklist no tiene items');

    const asignadoAId = dto.asignadoAId || usuarioId;
    if (this.isTechnician(currentUserRole) && asignadoAId !== usuarioId) throw new ForbiddenException('Un técnico solo puede crear inspecciones propias');
    if (asignadoAId !== usuarioId) await this.assertAuthorizedAssignee(asignadoAId, empresaId, organizacionEmpresaId);

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
        descripcion: dto.descripcion,
        fechaProgramada: dto.fechaProgramada ? new Date(dto.fechaProgramada) : undefined,
        fechaHoraInicio: new Date(),
        ubicacionTexto: dto.ubicacionTexto,
        latitud: dto.latitud,
        longitud: dto.longitud,
        estado,
        items: { create: checklist.items.map((item) => ({ checklistItemId: item.id, cumplimiento: CumplimientoItem.PENDIENTE })) },
      },
      include: { ...this.listInclude, items: { include: { checklistItem: true }, orderBy: { checklistItem: { orden: 'asc' as const } } } },
    });
  }

  async iniciar(id: string, empresaId: string, organizacionEmpresaId: string, usuarioId: string, currentUserRole: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, this.isTechnician(currentUserRole) ? usuarioId : undefined, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE) throw new BadRequestException('Solo se pueden iniciar inspecciones pendientes');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.EN_PROGRESO, fechaHoraInicio: new Date(), fechaHoraFin: null }, include: this.listInclude });
  }

  async reasignar(id: string, dto: ReasignarInspeccionDto, empresaId: string, organizacionEmpresaId: string, efectuadoPorId: string, currentUserRole: Rol) {
    if (currentUserRole !== Rol.ADMIN_EMPRESA && currentUserRole !== Rol.SUPERVISOR) throw new ForbiddenException('Solo administradores y supervisores pueden reasignar inspecciones');
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE) throw new BadRequestException('Solo se pueden reasignar inspecciones pendientes');
    await this.assertAuthorizedAssignee(dto.asignadoAId, empresaId, organizacionEmpresaId);
    if (dto.asignadoAId === inspeccion.asignadoAId) throw new BadRequestException('La inspección ya está asignada a ese técnico');
    return this.prisma.$transaction(async (tx) => {
      await tx.inspeccionReasignacion.create({ data: { inspeccionId: id, desdeUsuarioId: inspeccion.asignadoAId, haciaUsuarioId: dto.asignadoAId, efectuadaPorId: efectuadoPorId } });
      return tx.inspeccion.update({ where: { id }, data: { asignadoAId: dto.asignadoAId, usuarioId: dto.asignadoAId }, include: this.listInclude });
    });
  }

  async registrarItem(id: string, dto: RegistrarItemDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('La inspección no está en progreso');
    if (!inspeccion.items.some((item) => item.id === dto.inspeccionItemId)) throw new NotFoundException('Item no encontrado en esta inspección');
    return this.prisma.inspeccionItem.update({ where: { id: dto.inspeccionItemId }, data: { cumplimiento: dto.cumplimiento, observacion: dto.observacion }, include: { checklistItem: true } });
  }

  async registrarMultiplesItems(id: string, items: RegistrarItemDto[], empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('La inspección no está en progreso');
    if (items.some((item) => !inspeccion.items.some((existing) => existing.id === item.inspeccionItemId))) throw new NotFoundException('Uno de los items no pertenece a esta inspección');
    await this.prisma.$transaction(items.map((item) => this.prisma.inspeccionItem.update({ where: { id: item.inspeccionItemId }, data: { cumplimiento: item.cumplimiento, observacion: item.observacion } })));
    return this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
  }

  async update(id: string, dto: UpdateInspeccionDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('No se puede editar una inspección que no está en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: dto, include: this.listInclude });
  }

  async finalizar(id: string, dto: FinalizarInspeccionDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('Solo se pueden finalizar inspecciones en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.COMPLETADA, fechaHoraFin: new Date(), observaciones: dto.observaciones }, include: this.detailInclude });
  }

  async cancelar(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
    if (inspeccion.estado !== EstadoInspeccion.PENDIENTE && inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) throw new BadRequestException('Solo se pueden cancelar inspecciones pendientes o en progreso');
    return this.prisma.inspeccion.update({ where: { id }, data: { estado: EstadoInspeccion.CANCELADA, fechaHoraFin: new Date() }, include: this.listInclude });
  }

  async getResumen(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string, currentUserRole?: Rol) {
    const inspeccion = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId, currentUserRole);
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

  async findMine(usuarioId: string, empresaId: string, filters?: { estado?: EstadoInspeccion }, organizacionEmpresaId?: string) {
    return this.prisma.inspeccion.findMany({ where: { asignadoAId: usuarioId, empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...(filters?.estado && { estado: filters.estado }) }, include: this.listInclude, orderBy: [{ fechaProgramada: 'asc' }, { fechaHoraInicio: 'desc' }] });
  }
}

