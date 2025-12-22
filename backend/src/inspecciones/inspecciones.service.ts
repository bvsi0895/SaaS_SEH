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
} from './dto';
import { EstadoInspeccion, CumplimientoItem } from '@prisma/client';

@Injectable()
export class InspeccionesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todas las inspecciones de una empresa
   */
  async findAll(
    empresaId: string,
    filters?: {
      estado?: EstadoInspeccion;
      usuarioId?: string;
      checklistId?: string;
      sector?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
  ) {
    return this.prisma.inspeccion.findMany({
      where: {
        empresaId,
        ...(filters?.estado && { estado: filters.estado }),
        ...(filters?.usuarioId && { usuarioId: filters.usuarioId }),
        ...(filters?.checklistId && { checklistId: filters.checklistId }),
        ...(filters?.sector && { sector: { contains: filters.sector, mode: 'insensitive' } }),
        ...(filters?.fechaDesde && { fechaHoraInicio: { gte: filters.fechaDesde } }),
        ...(filters?.fechaHasta && { fechaHoraInicio: { lte: filters.fechaHasta } }),
      },
      include: {
        checklist: {
          select: { id: true, nombre: true, tipo: true },
        },
        usuario: {
          select: { id: true, nombre: true, apellido: true },
        },
        _count: {
          select: { items: true, hallazgos: true },
        },
      },
      orderBy: { fechaHoraInicio: 'desc' },
    });
  }

  /**
   * Obtener inspección por ID
   */
  async findOne(id: string, empresaId?: string) {
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id },
      include: {
        checklist: {
          include: {
            items: {
              orderBy: { orden: 'asc' },
            },
          },
        },
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        items: {
          include: {
            checklistItem: true,
          },
          orderBy: {
            checklistItem: { orden: 'asc' },
          },
        },
        hallazgos: {
          include: {
            accionesCorrectivas: {
              select: { id: true, descripcion: true, estado: true },
            },
          },
        },
      },
    });

    if (!inspeccion) {
      throw new NotFoundException('Inspección no encontrada');
    }

    if (empresaId && inspeccion.empresaId !== empresaId) {
      throw new NotFoundException('Inspección no encontrada');
    }

    return inspeccion;
  }

  /**
   * Crear nueva inspección
   */
  async create(createInspeccionDto: CreateInspeccionDto, usuarioId: string, empresaId: string) {
    // Verificar que el checklist existe y está activo
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: createInspeccionDto.checklistId },
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!checklist) {
      throw new NotFoundException('Checklist no encontrado');
    }

    if (!checklist.activo) {
      throw new BadRequestException('El checklist está desactivado');
    }

    if (checklist.empresaId !== empresaId) {
      throw new ForbiddenException('No tiene acceso a este checklist');
    }

    if (checklist.items.length === 0) {
      throw new BadRequestException('El checklist no tiene items');
    }

    // Crear inspección con items vacíos
    const inspeccion = await this.prisma.inspeccion.create({
      data: {
        checklistId: createInspeccionDto.checklistId,
        usuarioId,
        empresaId,
        sector: createInspeccionDto.sector,
        descripcion: createInspeccionDto.descripcion,
        ubicacionTexto: createInspeccionDto.ubicacionTexto,
        latitud: createInspeccionDto.latitud,
        longitud: createInspeccionDto.longitud,
        estado: EstadoInspeccion.EN_PROGRESO,
        items: {
          create: checklist.items.map((item) => ({
            checklistItemId: item.id,
            cumplimiento: CumplimientoItem.CUMPLE, // Por defecto
          })),
        },
      },
      include: {
        checklist: {
          select: { id: true, nombre: true, tipo: true },
        },
        usuario: {
          select: { id: true, nombre: true, apellido: true },
        },
        items: {
          include: { checklistItem: true },
          orderBy: { checklistItem: { orden: 'asc' } },
        },
      },
    });

    return inspeccion;
  }

  /**
   * Registrar cumplimiento de un item
   */
  async registrarItem(inspeccionId: string, registrarItemDto: RegistrarItemDto, empresaId?: string) {
    // Verificar que la inspección existe y está en progreso
    const inspeccion = await this.findOne(inspeccionId, empresaId);

    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException('La inspección ya está finalizada');
    }

    // Verificar que el item pertenece a esta inspección
    const item = inspeccion.items.find((i) => i.id === registrarItemDto.inspeccionItemId);
    if (!item) {
      throw new NotFoundException('Item no encontrado en esta inspección');
    }

    // Actualizar item
    return this.prisma.inspeccionItem.update({
      where: { id: registrarItemDto.inspeccionItemId },
      data: {
        cumplimiento: registrarItemDto.cumplimiento,
        observacion: registrarItemDto.observacion,
      },
      include: {
        checklistItem: true,
      },
    });
  }

  /**
   * Registrar múltiples items de una vez
   */
  async registrarMultiplesItems(
    inspeccionId: string,
    items: RegistrarItemDto[],
    empresaId?: string,
  ) {
    const inspeccion = await this.findOne(inspeccionId, empresaId);

    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException('La inspección ya está finalizada');
    }

    const updates = items.map((item) =>
      this.prisma.inspeccionItem.update({
        where: { id: item.inspeccionItemId },
        data: {
          cumplimiento: item.cumplimiento,
          observacion: item.observacion,
        },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findOne(inspeccionId);
  }

  /**
   * Actualizar inspección
   */
  async update(id: string, updateInspeccionDto: UpdateInspeccionDto, empresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId);

    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException('No se puede editar una inspección finalizada');
    }

    return this.prisma.inspeccion.update({
      where: { id },
      data: updateInspeccionDto,
    });
  }

  /**
   * Finalizar inspección
   */
  async finalizar(id: string, finalizarDto: FinalizarInspeccionDto, empresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId);

    if (inspeccion.estado === EstadoInspeccion.COMPLETADA) {
      throw new BadRequestException('La inspección ya está finalizada');
    }

    if (inspeccion.estado === EstadoInspeccion.CANCELADA) {
      throw new BadRequestException('La inspección fue cancelada');
    }

    return this.prisma.inspeccion.update({
      where: { id },
      data: {
        estado: EstadoInspeccion.COMPLETADA,
        fechaHoraFin: new Date(),
        observaciones: finalizarDto.observaciones,
      },
      include: {
        checklist: true,
        usuario: {
          select: { id: true, nombre: true, apellido: true },
        },
        items: {
          include: { checklistItem: true },
        },
        hallazgos: true,
      },
    });
  }

  /**
   * Cancelar inspección
   */
  async cancelar(id: string, empresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId);

    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException('Solo se pueden cancelar inspecciones en progreso');
    }

    return this.prisma.inspeccion.update({
      where: { id },
      data: {
        estado: EstadoInspeccion.CANCELADA,
        fechaHoraFin: new Date(),
      },
    });
  }

  /**
   * Obtener resumen de inspección
   */
  async getResumen(id: string, empresaId?: string) {
    const inspeccion = await this.findOne(id, empresaId);

    const itemsCumplen = inspeccion.items.filter(
      (i) => i.cumplimiento === CumplimientoItem.CUMPLE,
    ).length;
    const itemsNoCumplen = inspeccion.items.filter(
      (i) => i.cumplimiento === CumplimientoItem.NO_CUMPLE,
    ).length;
    const itemsNoAplica = inspeccion.items.filter(
      (i) => i.cumplimiento === CumplimientoItem.NO_APLICA,
    ).length;
    const itemsObservacion = inspeccion.items.filter(
      (i) => i.cumplimiento === CumplimientoItem.OBSERVACION,
    ).length;

    const totalItems = inspeccion.items.length;
    const porcentajeCumplimiento =
      totalItems > 0 ? Math.round((itemsCumplen / (totalItems - itemsNoAplica)) * 100) : 0;

    return {
      id: inspeccion.id,
      sector: inspeccion.sector,
      estado: inspeccion.estado,
      fechaInicio: inspeccion.fechaHoraInicio,
      fechaFin: inspeccion.fechaHoraFin,
      checklist: inspeccion.checklist.nombre,
      tecnico: `${inspeccion.usuario.nombre} ${inspeccion.usuario.apellido}`,
      resumen: {
        totalItems,
        itemsCumplen,
        itemsNoCumplen,
        itemsNoAplica,
        itemsObservacion,
        porcentajeCumplimiento,
      },
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

  /**
   * Obtener inspecciones del usuario actual
   */
  async findMine(usuarioId: string, empresaId: string, filters?: { estado?: EstadoInspeccion }) {
    return this.prisma.inspeccion.findMany({
      where: {
        usuarioId,
        empresaId,
        ...(filters?.estado && { estado: filters.estado }),
      },
      include: {
        checklist: {
          select: { id: true, nombre: true, tipo: true },
        },
        _count: {
          select: { items: true, hallazgos: true },
        },
      },
      orderBy: { fechaHoraInicio: 'desc' },
    });
  }
}
