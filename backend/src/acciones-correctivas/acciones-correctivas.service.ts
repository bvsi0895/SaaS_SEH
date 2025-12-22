import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccionCorrectivaDto, UpdateAccionCorrectivaDto, CerrarAccionDto } from './dto';
import { EstadoAccion } from '@prisma/client';

@Injectable()
export class AccionesCorrectivasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todas las acciones correctivas de una empresa
   */
  async findAll(
    empresaId: string,
    filters?: {
      estado?: EstadoAccion;
      responsableId?: string;
      hallazgoId?: string;
      vencidas?: boolean;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
  ) {
    const now = new Date();

    return this.prisma.accionCorrectiva.findMany({
      where: {
        empresaId,
        ...(filters?.estado && { estado: filters.estado }),
        ...(filters?.responsableId && { responsableId: filters.responsableId }),
        ...(filters?.hallazgoId && { hallazgoId: filters.hallazgoId }),
        ...(filters?.vencidas && {
          fechaCompromiso: { lt: now },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        }),
        ...(filters?.fechaDesde && { createdAt: { gte: filters.fechaDesde } }),
        ...(filters?.fechaHasta && { createdAt: { lte: filters.fechaHasta } }),
      },
      include: {
        hallazgo: {
          select: {
            id: true,
            titulo: true,
            nivelRiesgo: true,
            inspeccion: {
              select: { id: true, sector: true },
            },
          },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
        creador: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: { fechaCompromiso: 'asc' },
    });
  }

  /**
   * Obtener acción correctiva por ID
   */
  async findOne(id: string, empresaId?: string) {
    const accion = await this.prisma.accionCorrectiva.findUnique({
      where: { id },
      include: {
        hallazgo: {
          include: {
            inspeccion: {
              select: {
                id: true,
                sector: true,
                checklist: { select: { nombre: true } },
              },
            },
          },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        creador: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    if (!accion) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }

    if (empresaId && accion.empresaId !== empresaId) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }

    return accion;
  }

  /**
   * Crear nueva acción correctiva
   */
  async create(
    createDto: CreateAccionCorrectivaDto,
    creadorId: string,
    empresaId: string,
  ) {
    // Verificar que el hallazgo existe
    const hallazgo = await this.prisma.hallazgo.findUnique({
      where: { id: createDto.hallazgoId },
      include: { inspeccion: true },
    });

    if (!hallazgo) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    if (hallazgo.inspeccion.empresaId !== empresaId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    // Verificar responsable si se proporciona ID
    if (createDto.responsableId) {
      const responsable = await this.prisma.usuario.findUnique({
        where: { id: createDto.responsableId },
      });

      if (!responsable || responsable.empresaId !== empresaId) {
        throw new BadRequestException('Responsable no encontrado');
      }
    }

    return this.prisma.accionCorrectiva.create({
      data: {
        hallazgoId: createDto.hallazgoId,
        empresaId,
        creadorId,
        descripcion: createDto.descripcion,
        fechaCompromiso: new Date(createDto.fechaCompromiso),
        responsableId: createDto.responsableId,
        responsableTexto: createDto.responsableTexto,
        estado: EstadoAccion.PENDIENTE,
      },
      include: {
        hallazgo: {
          select: { id: true, titulo: true },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });
  }

  /**
   * Actualizar acción correctiva
   */
  async update(id: string, updateDto: UpdateAccionCorrectivaDto, empresaId?: string) {
    const accion = await this.findOne(id, empresaId);

    if (accion.estado === EstadoAccion.RESUELTA) {
      throw new BadRequestException('No se puede editar una acción cerrada');
    }

    const { fechaCompromiso, ...data } = updateDto;

    return this.prisma.accionCorrectiva.update({
      where: { id },
      data: {
        ...data,
        ...(fechaCompromiso && { fechaCompromiso: new Date(fechaCompromiso) }),
      },
      include: {
        hallazgo: {
          select: { id: true, titulo: true },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });
  }

  /**
   * Cambiar estado a En Progreso
   */
  async iniciar(id: string, empresaId?: string) {
    const accion = await this.findOne(id, empresaId);

    if (accion.estado !== EstadoAccion.PENDIENTE) {
      throw new BadRequestException('La acción ya fue iniciada');
    }

    return this.prisma.accionCorrectiva.update({
      where: { id },
      data: { estado: EstadoAccion.EN_PROGRESO },
    });
  }

  /**
   * Cerrar acción correctiva
   */
  async cerrar(id: string, cerrarDto: CerrarAccionDto, empresaId?: string) {
    const accion = await this.findOne(id, empresaId);

    if (accion.estado === EstadoAccion.RESUELTA) {
      throw new BadRequestException('La acción ya está cerrada');
    }

    return this.prisma.accionCorrectiva.update({
      where: { id },
      data: {
        estado: EstadoAccion.RESUELTA,
        fechaCierre: new Date(),
        notasCierre: cerrarDto.notasCierre,
        evidenciaUrl: cerrarDto.evidenciaUrl,
      },
    });
  }

  /**
   * Reabrir acción correctiva
   */
  async reabrir(id: string, empresaId?: string) {
    const accion = await this.findOne(id, empresaId);

    if (accion.estado !== EstadoAccion.RESUELTA) {
      throw new BadRequestException('La acción no está cerrada');
    }

    return this.prisma.accionCorrectiva.update({
      where: { id },
      data: {
        estado: EstadoAccion.EN_PROGRESO,
        fechaCierre: null,
      },
    });
  }

  /**
   * Obtener acciones asignadas al usuario actual
   */
  async findMine(usuarioId: string, empresaId: string, filters?: { estado?: EstadoAccion }) {
    return this.prisma.accionCorrectiva.findMany({
      where: {
        responsableId: usuarioId,
        empresaId,
        ...(filters?.estado && { estado: filters.estado }),
      },
      include: {
        hallazgo: {
          select: {
            id: true,
            titulo: true,
            nivelRiesgo: true,
            inspeccion: { select: { sector: true } },
          },
        },
      },
      orderBy: { fechaCompromiso: 'asc' },
    });
  }

  /**
   * Obtener estadísticas de acciones correctivas
   */
  async getEstadisticas(empresaId: string) {
    const now = new Date();

    const [total, porEstado, vencidas, proximasVencer] = await Promise.all([
      this.prisma.accionCorrectiva.count({ where: { empresaId } }),
      this.prisma.accionCorrectiva.groupBy({
        by: ['estado'],
        _count: true,
        where: { empresaId },
      }),
      this.prisma.accionCorrectiva.count({
        where: {
          empresaId,
          fechaCompromiso: { lt: now },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        },
      }),
      this.prisma.accionCorrectiva.count({
        where: {
          empresaId,
          fechaCompromiso: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días
          },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        },
      }),
    ]);

    return {
      total,
      porEstado: porEstado.reduce(
        (acc, item) => {
          acc[item.estado] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      vencidas,
      proximasVencer,
    };
  }
}
