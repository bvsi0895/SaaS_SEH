import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
// Sharp is CommonJS at runtime in the current Nest/Jest toolchain.
const sharp = require('sharp') as any;
import { PrismaService } from '../prisma/prisma.service';
import { CreateHallazgoDto, UpdateHallazgoDto } from './dto';
import { NivelRiesgo, EstadoInspeccion } from '@prisma/client';

@Injectable()
export class HallazgosService {
  private static activeImageOptimizations = 0;

  constructor(private prisma: PrismaService) {
    const configuredConcurrency = Number(process.env.SHARP_CONCURRENCY || 1);
    const concurrency = Number.isFinite(configuredConcurrency) && configuredConcurrency >= 1
      ? Math.floor(configuredConcurrency)
      : 1;
    sharp.concurrency(concurrency);
    sharp.cache({ memory: 32, files: 0, items: 100 });
  }

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

  private getMaxImagePixels(): number {
    const configured = Number(process.env.MAX_IMAGE_PIXELS || 40_000_000);
    return Number.isFinite(configured) && configured > 0 ? configured : 40_000_000;
  }

  private getWebpQuality(): number {
    const configured = Number(process.env.WEBP_QUALITY || 82);
    return Number.isFinite(configured) && configured >= 1 && configured <= 100 ? configured : 82;
  }

  private getMaxConcurrentOptimizations(): number {
    const configured = Number(process.env.MAX_IMAGE_PROCESSING_CONCURRENCY || 1);
    return Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : 1;
  }

  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    const maxConcurrent = this.getMaxConcurrentOptimizations();
    while (HallazgosService.activeImageOptimizations >= maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    HallazgosService.activeImageOptimizations += 1;
    const maxImagePixels = this.getMaxImagePixels();
    try {
      const image = sharp(buffer, {
        limitInputPixels: maxImagePixels,
        failOn: 'warning',
      });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxImagePixels) {
        throw new Error('image dimensions exceed the configured limit');
      }

      return image
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: this.getWebpQuality() })
        .toBuffer();
    } catch {
      throw new BadRequestException('La imagen está corrupta o supera los límites permitidos');
    } finally {
      HallazgosService.activeImageOptimizations -= 1;
    }
  }

  async addPhoto(id: string, empresaId: string, file: { buffer: Buffer; originalname: string }, organizacionEmpresaId?: string, usuarioId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId);
    // Los técnicos solo pueden incorporar evidencias a hallazgos de sus propias
    // inspecciones y mientras la inspección siga abierta. Los administradores
    // conservan el comportamiento administrativo existente.
    if (usuarioId && hallazgo.inspeccion.usuario.id !== usuarioId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }
    if (usuarioId && hallazgo.inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException('No se pueden agregar evidencias a una inspección finalizada');
    }
    if (!this.isSupportedImage(file.buffer)) {
      throw new BadRequestException('El contenido no corresponde a una imagen JPG, PNG o WEBP válida');
    }
    const optimized = await this.optimizeImage(file.buffer);
    const filename = `${id}-${randomUUID()}.webp`;
    const uploadDir = this.getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, optimized, { flag: 'wx' });
    const photos = hallazgo.fotosUrls ? JSON.parse(hallazgo.fotosUrls) as string[] : [];
    photos.push(`/api/hallazgos/${id}/fotos/${filename}`);
    try {
      return await this.prisma.hallazgo.update({
        where: { id },
        data: { fotosUrls: JSON.stringify(photos) },
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }
  }

  async getPhoto(id: string, filename: string, empresaId: string, organizacionEmpresaId?: string, usuarioId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId);
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
    usuarioId?: string,
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
        ...(usuarioId && {
          OR: [
            { inspeccion: { usuarioId } },
            { accionesCorrectivas: { some: { responsableId: usuarioId } } },
          ],
        }),
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
  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string) {
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
    if (
      usuarioId &&
      hallazgo.inspeccion.usuario.id !== usuarioId &&
      !hallazgo.accionesCorrectivas.some((accion) => accion.responsable?.id === usuarioId)
    ) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    return hallazgo;
  }

  /**
   * Crear nuevo hallazgo
   */
  async create(createHallazgoDto: CreateHallazgoDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string) {
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
    if (usuarioId && inspeccion.usuarioId !== usuarioId) {
      throw new NotFoundException('Inspección no encontrada');
    }

    // Solo crear hallazgos en inspecciones en progreso
    if (inspeccion.estado !== EstadoInspeccion.EN_PROGRESO) {
      throw new BadRequestException(
        'Solo se pueden agregar hallazgos a inspecciones en progreso',
      );
    }

    if (createHallazgoDto.inspeccionItemId) {
      const item = await this.prisma.inspeccionItem.findUnique({
        where: { id: createHallazgoDto.inspeccionItemId },
        select: { id: true, inspeccionId: true },
      });
      if (!item || item.inspeccionId !== createHallazgoDto.inspeccionId) {
        throw new BadRequestException('El ítem no pertenece a la inspección');
      }

      const existing = await this.prisma.hallazgo.findUnique({
        where: { inspeccionItemId: createHallazgoDto.inspeccionItemId },
      });
      if (existing) {
        return this.update(existing.id, {
          titulo: createHallazgoDto.titulo,
          descripcion: createHallazgoDto.descripcion,
          nivelRiesgo: createHallazgoDto.nivelRiesgo,
          ubicacionTexto: createHallazgoDto.ubicacionTexto,
          fotosUrls: createHallazgoDto.fotosUrls,
        }, empresaId, organizacionEmpresaId, usuarioId);
      }
    }

    return this.prisma.hallazgo.create({
      data: {
        inspeccionId: createHallazgoDto.inspeccionId,
        ...(createHallazgoDto.inspeccionItemId && { inspeccionItemId: createHallazgoDto.inspeccionItemId }),
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
  async update(id: string, updateHallazgoDto: UpdateHallazgoDto, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId);

    if (usuarioId && hallazgo.inspeccion.usuario.id !== usuarioId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

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
  async remove(id: string, empresaId?: string, organizacionEmpresaId?: string, usuarioId?: string) {
    const hallazgo = await this.findOne(id, empresaId, organizacionEmpresaId, usuarioId);

    if (usuarioId && hallazgo.inspeccion.usuario.id !== usuarioId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

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
