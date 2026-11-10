import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { extname, join, basename } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHallazgoDto, UpdateHallazgoDto } from './dto';
import { NivelRiesgo, EstadoInspeccion } from '@prisma/client';

@Injectable()
export class HallazgosService {
  constructor(private prisma: PrismaService) {}

  private isSupportedImage(buffer: Buffer): boolean {
    return (
      (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP')
    );
  }

  private getUploadDir() {
    return join(process.cwd(), process.env.UPLOAD_DIR || './uploads', 'hallazgos');
  }

  async addPhoto(id: string, empresaId: string, file: { buffer: Buffer; originalname: string }, organizacionEmpresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId);
    if (!this.isSupportedImage(file.buffer)) {
      throw new BadRequestException('El contenido no corresponde a una imagen JPG, PNG o WEBP válida');
    }
    const extension = extname(file.originalname).toLowerCase();
    const filename = `${id}-${randomUUID()}${extension}`;
    const uploadDir = this.getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer, { flag: 'wx' });
    const photos = hallazgo.fotosUrls ? JSON.parse(hallazgo.fotosUrls) as string[] : [];
    photos.push(`/api/hallazgos/${id}/fotos/${filename}`);
    return this.prisma.hallazgo.update({
      where: { id },
      data: { fotosUrls: JSON.stringify(photos) },
    });
  }

  async getPhoto(id: string, filename: string, empresaId: string, organizacionEmpresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId);
    const photos = hallazgo.fotosUrls ? JSON.parse(hallazgo.fotosUrls) as string[] : [];
    if (!photos.some((photo) => basename(photo) === filename)) {
      throw new NotFoundException('Foto no encontrada');
    }
    return readFile(join(this.getUploadDir(), basename(filename)));
  }

  /** Lee una evidencia para procesos internos ya autorizados, sin exponer una URL pública. */
  async readPhotoForReport(id: string, filename: string, empresaId: string, organizacionEmpresaId: string) {
    return this.getPhoto(id, filename, empresaId, organizacionEmpresaId);
  }

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
    organizacionEmpresaId?: string,
  ) {
    return this.prisma.hallazgo.findMany({
      where: {
        inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }) },
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
  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string) {
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
            organizacionEmpresaId: true,
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
    if (organizacionEmpresaId && hallazgo.inspeccion.organizacionEmpresaId !== organizacionEmpresaId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    return hallazgo;
  }

  /**
   * Crear nuevo hallazgo
   */
  async create(createHallazgoDto: CreateHallazgoDto, empresaId?: string, organizacionEmpresaId?: string) {
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
    if (organizacionEmpresaId && inspeccion.organizacionEmpresaId !== organizacionEmpresaId) {
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
  async update(id: string, updateHallazgoDto: UpdateHallazgoDto, empresaId?: string, organizacionEmpresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId);

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
  async remove(id: string, empresaId?: string, organizacionEmpresaId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId);

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
  async getEstadisticas(empresaId: string, fechaDesde?: Date, fechaHasta?: Date, organizacionEmpresaId?: string) {
    const whereClause = {
      inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }) },
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
