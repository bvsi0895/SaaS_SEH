import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHallazgoDto, UpdateHallazgoDto } from './dto';
import { NivelRiesgo, EstadoInspeccion } from '@prisma/client';

@Injectable()
export class HallazgosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los hallazgos de una empresa
   */
  async findAll(
    empresaId: string,
    filters?: {
      nivelRiesgo?: NivelRiesgo;
      inspeccionId?: string;
      conAccionesCorrectivas?: boolean;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
  ) {
    return this.prisma.hallazgo.findMany({
      where: {
        inspeccion: { empresaId },
        ...(filters?.nivelRiesgo && { nivelRiesgo: filters.nivelRiesgo }),
        ...(filters?.inspeccionId && { inspeccionId: filters.inspeccionId }),
        ...(filters?.conAccionesCorrectivas !== undefined && {
          accionesCorrectivas: filters.conAccionesCorrectivas
            ? { some: {} }
            : { none: {} },
        }),
        ...(filters?.fechaDesde && { createdAt: { gte: filters.fechaDesde } }),
        ...(filters?.fechaHasta && { createdAt: { lte: filters.fechaHasta } }),
      },
      include: {
        inspeccion: {
          select: {
            id: true,
            sector: true,
            fechaHoraInicio: true,
            checklist: { select: { nombre: true } },
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
        accionesCorrectivas: {
          select: { id: true, descripcion: true, estado: true, fechaCompromiso: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener hallazgo por ID
   */
  async findOne(id: string, empresaId?: string) {
    const hallazgo = await this.prisma.hallazgo.findUnique({
      where: { id },
      include: {
        inspeccion: {
          select: {
            id: true,
            sector: true,
            fechaHoraInicio: true,
            estado: true,
            empresaId: true,
            checklist: { select: { id: true, nombre: true } },
            usuario: { select: { id: true, nombre: true, apellido: true } },
          },
        },
        accionesCorrectivas: {
          include: {
            responsable: { select: { id: true, nombre: true, apellido: true } },
            creador: { select: { id: true, nombre: true, apellido: true } },
          },
        },
      },
    });

    if (!hallazgo) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    if (empresaId && hallazgo.inspeccion.empresaId !== empresaId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    return hallazgo;
  }

  /**
   * Crear nuevo hallazgo
   */
  async create(createHallazgoDto: CreateHallazgoDto, empresaId?: string) {
    // Verificar que la inspección existe
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: createHallazgoDto.inspeccionId },
    });

    if (!inspeccion) {
      throw new NotFoundException('Inspección no encontrada');
    }

    if (empresaId && inspeccion.empresaId !== empresaId) {
      throw new NotFoundException('Inspección no encontrada');
    }

    // Solo crear hallazgos en inspecciones en progreso
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException(
        'Solo se pueden agregar hallazgos a inspecciones en progreso',
      );
    }

    return this.prisma.hallazgo.create({
      data: {
        inspeccionId: createHallazgoDto.inspeccionId,
        titulo: createHallazgoDto.titulo,
        descripcion: createHallazgoDto.descripcion,
        nivelRiesgo: createHallazgoDto.nivelRiesgo,
        ubicacionTexto: createHallazgoDto.ubicacionTexto,
        fotosUrls: createHallazgoDto.fotosUrls
          ? JSON.stringify(createHallazgoDto.fotosUrls)
          : null,
      },
      include: {
        inspeccion: {
          select: { id: true, sector: true },
        },
      },
    });
  }

  /**
   * Actualizar hallazgo
   */
  async update(id: string, updateHallazgoDto: UpdateHallazgoDto, empresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId);

    // Solo editar si la inspección está en progreso
    if (hallazgo.inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException(
        'No se puede editar un hallazgo de una inspección finalizada',
      );
    }

    const { fotosUrls, ...data } = updateHallazgoDto;

    return this.prisma.hallazgo.update({
      where: { id },
      data: {
        ...data,
        ...(fotosUrls && { fotosUrls: JSON.stringify(fotosUrls) }),
      },
    });
  }

  /**
   * Eliminar hallazgo
   */
  async remove(id: string, empresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId);

    // Solo eliminar si la inspección está en progreso
    if (hallazgo.inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException(
        'No se puede eliminar un hallazgo de una inspección finalizada',
      );
    }

    // No eliminar si tiene acciones correctivas
    if (hallazgo.accionesCorrectivas.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un hallazgo que tiene acciones correctivas asociadas',
      );
    }

    await this.prisma.hallazgo.delete({
      where: { id },
    });

    return { message: 'Hallazgo eliminado exitosamente' };
  }

  /**
   * Obtener estadísticas de hallazgos
   */
  async getEstadisticas(empresaId: string, fechaDesde?: Date, fechaHasta?: Date) {
    const whereClause = {
      inspeccion: { empresaId },
      ...(fechaDesde && { createdAt: { gte: fechaDesde } }),
      ...(fechaHasta && { createdAt: { lte: fechaHasta } }),
    };

    const [total, porNivel, conAcciones, sinAcciones] = await Promise.all([
      this.prisma.hallazgo.count({ where: whereClause }),
      this.prisma.hallazgo.groupBy({
        by: ['nivelRiesgo'],
        _count: true,
        where: whereClause,
      }),
      this.prisma.hallazgo.count({
        where: { ...whereClause, accionesCorrectivas: { some: {} } },
      }),
      this.prisma.hallazgo.count({
        where: { ...whereClause, accionesCorrectivas: { none: {} } },
      }),
    ]);

    return {
      total,
      porNivel: porNivel.reduce(
        (acc, item) => {
          acc[item.nivelRiesgo] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      conAccionesCorrectivas: conAcciones,
      sinAccionesCorrectivas: sinAcciones,
    };
  }
}
