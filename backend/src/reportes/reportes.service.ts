import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PDFInspeccionGenerator } from './generators/pdf-inspeccion.generator';

@Injectable()
export class ReportesService {
  private pdfGenerator = new PDFInspeccionGenerator();

  constructor(private prisma: PrismaService) {}

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
