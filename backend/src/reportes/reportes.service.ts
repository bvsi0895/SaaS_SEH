import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PDFInspeccionGenerator } from './generators/pdf-inspeccion.generator';
import { PDFMensualGenerator } from './generators/pdf-mensual.generator';
import { EstadoInspeccion } from '@prisma/client';
import { readFile } from 'fs/promises';
import { basename, extname, relative, resolve } from 'path';
import { HallazgosService } from '../hallazgos/hallazgos.service';

@Injectable()
export class ReportesService {
  private pdfGenerator = new PDFInspeccionGenerator();
  private monthlyPdfGenerator = new PDFMensualGenerator();

  constructor(private prisma: PrismaService, private hallazgosService: HallazgosService) {}

  private isSupportedImage(buffer: Buffer): boolean {
    return (
      (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
      (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP')
    );
  }

  private async loadConfiguredLogo(logoUrl?: string | null): Promise<{ buffer?: Buffer; incident?: string }> {
    if (!logoUrl) return {};
    const maxLogoBytes = 1_500_000;
    try {
      let buffer: Buffer;
      if (logoUrl.startsWith('data:image/')) {
        const match = logoUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
        if (!match) return { incident: 'el logo configurado no tiene un formato data:image permitido' };
        buffer = Buffer.from(match[2], 'base64');
      } else {
        if (/^https?:\/\//i.test(logoUrl) || /^file:/i.test(logoUrl)) {
          return { incident: 'el origen remoto del logo fue rechazado por seguridad' };
        }
        const uploadRoot = resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
        const candidate = resolve(process.cwd(), logoUrl.replace(/^[/\\]+/, ''));
        const pathRelativeToUploads = relative(uploadRoot, candidate);
        if (pathRelativeToUploads.startsWith('..') || pathRelativeToUploads.includes(':')) {
          return { incident: 'el logo no pertenece al almacenamiento local permitido' };
        }
        buffer = await readFile(candidate);
      }
      if (buffer.length === 0 || buffer.length > maxLogoBytes || !this.isSupportedImage(buffer)) {
        return { incident: 'el logo no es una imagen válida o supera el tamaño permitido' };
      }
      return { buffer };
    } catch {
      return { incident: 'el logo configurado no está disponible localmente' };
    }
  }

  private async loadReportPhotos(
    inspections: Array<{ hallazgos: Array<{ id: string; fotosUrls: string | null }> }>,
    empresaId: string,
    organizacionEmpresaId: string,
  ): Promise<{ fotos: Array<{ buffer: Buffer; nombre: string }>; incidencias: number }> {
    const fotos: Array<{ buffer: Buffer; nombre: string }> = [];
    let incidencias = 0;
    let totalBytes = 0;
    const maxPhotos = 12;
    const maxPhotoBytes = 2_000_000;
    const maxTotalBytes = 8_000_000;
    for (const inspection of inspections) {
      for (const hallazgo of inspection.hallazgos) {
        let urls: string[] = [];
        try { urls = hallazgo.fotosUrls ? JSON.parse(hallazgo.fotosUrls) as string[] : []; } catch { incidencias += 1; continue; }
        for (const url of urls) {
          if (fotos.length >= maxPhotos) { incidencias += 1; continue; }
          const filename = basename(url);
          if (!/\.(jpe?g|png|webp)$/i.test(extname(filename))) { incidencias += 1; continue; }
          try {
            const buffer = await this.hallazgosService.readPhotoForReport(hallazgo.id, filename, empresaId, organizacionEmpresaId);
            if (!this.isSupportedImage(buffer) || buffer.length > maxPhotoBytes || totalBytes + buffer.length > maxTotalBytes) {
              incidencias += 1;
              continue;
            }
            fotos.push({ buffer, nombre: filename });
            totalBytes += buffer.length;
          } catch {
            incidencias += 1;
          }
        }
      }
    }
    return { fotos, incidencias };
  }

  private async resolveEstablishmentScope(
    accesoEmpresaId: string,
    organizacionEmpresaId: string,
    empresaId: string,
    establecimientoId?: string,
  ): Promise<string[] | undefined> {
    const establishment = establecimientoId
      ? await this.prisma.establecimiento.findFirst({ where: { id: establecimientoId, empresaId } })
      : null;
    if (establecimientoId && !establishment) throw new NotFoundException('Establecimiento no encontrado');

    const scoped = await this.prisma.accesoEstablecimiento.findMany({
      where: { accesoEmpresaId, establecimiento: { empresaId } },
      select: { establecimientoId: true },
    });
    const allowedIds = scoped.map((item) => item.establecimientoId);
    if (establecimientoId && allowedIds.length > 0 && !allowedIds.includes(establecimientoId)) {
      throw new NotFoundException('Establecimiento no encontrado');
    }
    // Un acceso sin restricciones por establecimiento conserva el comportamiento legacy:
    // puede operar sobre todos los establecimientos de su empresa contextual.
    return allowedIds.length > 0 ? allowedIds : undefined;
  }

  /**
   * Generar PDF de una inspección
   */
  async generarPDFInspeccion(inspeccionId: string, empresaId?: string, organizacionEmpresaId?: string): Promise<Buffer> {
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId },
      include: {
        empresa: {
          select: { nombre: true, logoUrl: true },
        },
        checklist: {
          select: { nombre: true, tipo: true },
        },
        usuario: {
          select: { nombre: true, apellido: true, email: true },
        },
        items: {
          include: {
            checklistItem: {
              select: { descripcion: true, orden: true },
            },
          },
          orderBy: {
            checklistItem: { orden: 'asc' },
          },
        },
        hallazgos: {
          include: {
            accionesCorrectivas: {
              select: { descripcion: true, estado: true },
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
    if (organizacionEmpresaId && inspeccion.organizacionEmpresaId !== organizacionEmpresaId) {
      throw new NotFoundException('Inspección no encontrada');
    }

    return this.pdfGenerator.generate(inspeccion);
  }

  /**
   * Generar reporte consolidado de inspecciones
   */
  async generarReporteConsolidado(
    empresaId: string,
    filtros: { fechaDesde?: Date; fechaHasta?: Date },
    organizacionEmpresaId?: string,
  ) {
    const inspecciones = await this.prisma.inspeccion.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        estado: 'COMPLETADA',
        ...(filtros.fechaDesde && { fechaHoraInicio: { gte: filtros.fechaDesde } }),
        ...(filtros.fechaHasta && { fechaHoraInicio: { lte: filtros.fechaHasta } }),
      },
      include: {
        checklist: { select: { nombre: true } },
        usuario: { select: { nombre: true, apellido: true } },
        _count: { select: { hallazgos: true } },
      },
      orderBy: { fechaHoraInicio: 'desc' },
    });

    // Por ahora retornamos JSON, luego se puede generar PDF/Excel
    return {
      periodo: {
        desde: filtros.fechaDesde,
        hasta: filtros.fechaHasta,
      },
      totalInspecciones: inspecciones.length,
      inspecciones: inspecciones.map((i) => ({
        id: i.id,
        sector: i.sector,
        checklist: i.checklist.nombre,
        tecnico: `${i.usuario.nombre} ${i.usuario.apellido}`,
        fecha: i.fechaHoraInicio,
        hallazgos: i._count.hallazgos,
      })),
    };
  }

  async generarReporteMensualPDF(params: {
    empresaId: string;
    organizacionEmpresaId: string;
    accesoEmpresaId: string;
    establecimientoId?: string;
    fechaDesde: Date;
    fechaHasta: Date;
  }): Promise<Buffer> {
    const allowedEstablishmentIds = await this.resolveEstablishmentScope(
      params.accesoEmpresaId,
      params.organizacionEmpresaId,
      params.empresaId,
      params.establecimientoId,
    );
    const establishmentFilter = params.establecimientoId
      ? { establecimientoId: params.establecimientoId }
      : allowedEstablishmentIds
        ? { establecimientoId: { in: allowedEstablishmentIds } }
        : {};

    const relation = await this.prisma.organizacionEmpresa.findFirst({
      where: { id: params.organizacionEmpresaId, empresaId: params.empresaId },
      select: {
        empresa: { select: { nombre: true, cuit: true } },
        organizacion: { select: { nombre: true, logoUrl: true, emailContacto: true, telefono: true, direccion: true } },
      },
    });
    if (!relation) throw new NotFoundException('Contexto no encontrado');

    const [establishments, inspections, actions] = await Promise.all([
      this.prisma.establecimiento.findMany({
        where: { empresaId: params.empresaId, ...(params.establecimientoId ? { id: params.establecimientoId } : allowedEstablishmentIds ? { id: { in: allowedEstablishmentIds } } : {}) },
        select: { nombre: true, direccion: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.inspeccion.findMany({
        where: {
          empresaId: params.empresaId,
          organizacionEmpresaId: params.organizacionEmpresaId,
          estado: EstadoInspeccion.COMPLETADA,
          fechaHoraInicio: { gte: params.fechaDesde, lte: params.fechaHasta },
          ...establishmentFilter,
        },
        include: {
          establecimiento: { select: { nombre: true } },
          checklist: { select: { nombre: true } },
          usuario: { select: { nombre: true, apellido: true, email: true } },
          hallazgos: { select: { id: true, titulo: true, nivelRiesgo: true, createdAt: true, fotosUrls: true } },
        },
        orderBy: { fechaHoraInicio: 'asc' },
      }),
      this.prisma.accionCorrectiva.findMany({
        where: {
          empresaId: params.empresaId,
          organizacionEmpresaId: params.organizacionEmpresaId,
          createdAt: { gte: params.fechaDesde, lte: params.fechaHasta },
          hallazgo: { inspeccion: { ...establishmentFilter } },
        },
        include: {
          hallazgo: { select: { inspeccion: { select: { establecimiento: { select: { nombre: true } } } } } },
        },
        orderBy: { fechaCompromiso: 'asc' },
      }),
    ]);

    const primaryResponsible = inspections[0]?.usuario ?? await this.prisma.usuario.findUniqueOrThrow({
      where: { id: (await this.prisma.accesoEmpresa.findUniqueOrThrow({ where: { id: params.accesoEmpresaId }, select: { organizacionMiembro: { select: { usuarioId: true } } } })).organizacionMiembro.usuarioId },
      select: { nombre: true, apellido: true, email: true },
    });
    const hallazgos = inspections.flatMap((inspection) => inspection.hallazgos.map((hallazgo) => ({
      titulo: hallazgo.titulo,
      nivel: hallazgo.nivelRiesgo,
      establecimiento: inspection.establecimiento?.nombre,
      fecha: hallazgo.createdAt,
    })));
    const photoResult = await this.loadReportPhotos(inspections, params.empresaId, params.organizacionEmpresaId);
    const logoResult = await this.loadConfiguredLogo(relation.organizacion.logoUrl);

    return this.monthlyPdfGenerator.generate({
      organizacion: relation.organizacion,
      empresa: relation.empresa,
      establecimientos: establishments,
      periodo: { desde: params.fechaDesde, hasta: params.fechaHasta },
      responsable: primaryResponsible,
      inspecciones: inspections.map((inspection) => ({
        fecha: inspection.fechaHoraInicio,
        establecimiento: inspection.establecimiento?.nombre,
        sector: inspection.sector,
        checklist: inspection.checklist.nombre,
        tecnico: `${inspection.usuario.nombre} ${inspection.usuario.apellido}`,
        hallazgos: inspection.hallazgos.length,
      })),
      hallazgos,
      acciones: actions.map((action) => ({
        descripcion: action.descripcion,
        estado: action.estado,
        fechaCompromiso: action.fechaCompromiso,
        establecimiento: action.hallazgo.inspeccion.establecimiento?.nombre,
      })),
      fotos: photoResult.fotos,
      incidenciasFotografias: photoResult.incidencias,
      logo: logoResult.buffer,
      incidenciaLogo: logoResult.incident,
    });
  }

  /**
   * Generar reporte de hallazgos
   */
  async generarReporteHallazgos(
    empresaId: string,
    filtros: { fechaDesde?: Date; fechaHasta?: Date; nivelRiesgo?: string },
    organizacionEmpresaId?: string,
  ) {
    const hallazgos = await this.prisma.hallazgo.findMany({
      where: {
        inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }) },
        ...(filtros.fechaDesde && { createdAt: { gte: filtros.fechaDesde } }),
        ...(filtros.fechaHasta && { createdAt: { lte: filtros.fechaHasta } }),
        ...(filtros.nivelRiesgo && { nivelRiesgo: filtros.nivelRiesgo as any }),
      },
      include: {
        inspeccion: {
          select: {
            sector: true,
            fechaHoraInicio: true,
            checklist: { select: { nombre: true } },
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
        accionesCorrectivas: {
          select: { estado: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const resumen = {
      total: hallazgos.length,
      porNivel: {
        CRITICO: hallazgos.filter((h) => h.nivelRiesgo === 'CRITICO').length,
        ALTO: hallazgos.filter((h) => h.nivelRiesgo === 'ALTO').length,
        MEDIO: hallazgos.filter((h) => h.nivelRiesgo === 'MEDIO').length,
        BAJO: hallazgos.filter((h) => h.nivelRiesgo === 'BAJO').length,
      },
      conAccionCorrectiva: hallazgos.filter((h) => h.accionesCorrectivas.length > 0).length,
    };

    return {
      periodo: {
        desde: filtros.fechaDesde,
        hasta: filtros.fechaHasta,
      },
      resumen,
      hallazgos: hallazgos.map((h) => ({
        id: h.id,
        titulo: h.titulo,
        descripcion: h.descripcion,
        nivelRiesgo: h.nivelRiesgo,
        ubicacion: h.ubicacionTexto,
        fecha: h.createdAt,
        inspeccion: {
          sector: h.inspeccion.sector,
          checklist: h.inspeccion.checklist.nombre,
          tecnico: `${h.inspeccion.usuario.nombre} ${h.inspeccion.usuario.apellido}`,
        },
        tieneAccionCorrectiva: h.accionesCorrectivas.length > 0,
      })),
    };
  }

  /**
   * Generar reporte de acciones correctivas
   */
  async generarReporteAcciones(
    empresaId: string,
    filtros: { estado?: string; responsableId?: string },
    organizacionEmpresaId?: string,
  ) {
    const acciones = await this.prisma.accionCorrectiva.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(filtros.estado && { estado: filtros.estado as any }),
        ...(filtros.responsableId && { responsableId: filtros.responsableId }),
      },
      include: {
        hallazgo: {
          select: {
            titulo: true,
            nivelRiesgo: true,
            inspeccion: { select: { sector: true } },
          },
        },
        responsable: {
          select: { nombre: true, apellido: true },
        },
      },
      orderBy: { fechaCompromiso: 'asc' },
    });

    const now = new Date();
    const resumen = {
      total: acciones.length,
      porEstado: {
        PENDIENTE: acciones.filter((a) => a.estado === 'PENDIENTE').length,
        EN_PROGRESO: acciones.filter((a) => a.estado === 'EN_PROGRESO').length,
        RESUELTA: acciones.filter((a) => a.estado === 'RESUELTA').length,
        VENCIDA: acciones.filter((a) => a.estado === 'VENCIDA').length,
      },
      vencidas: acciones.filter(
        (a) =>
          a.fechaCompromiso < now &&
          (a.estado === 'PENDIENTE' || a.estado === 'EN_PROGRESO'),
      ).length,
    };

    return {
      resumen,
      acciones: acciones.map((a) => ({
        id: a.id,
        descripcion: a.descripcion,
        estado: a.estado,
        fechaCompromiso: a.fechaCompromiso,
        fechaCierre: a.fechaCierre,
        vencida:
          a.fechaCompromiso < now &&
          (a.estado === 'PENDIENTE' || a.estado === 'EN_PROGRESO'),
        responsable: a.responsable
          ? `${a.responsable.nombre} ${a.responsable.apellido}`
          : a.responsableTexto || 'Sin asignar',
        hallazgo: {
          titulo: a.hallazgo.titulo,
          nivelRiesgo: a.hallazgo.nivelRiesgo,
          sector: a.hallazgo.inspeccion.sector,
        },
      })),
    };
  }
}
