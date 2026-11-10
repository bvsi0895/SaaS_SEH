import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoInspeccion, EstadoAccion, NivelRiesgo } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async establishmentFilter(empresaId: string, establecimientoId?: string, accesoEmpresaId?: string) {
    if (!establecimientoId) return {};
    const establishment = await this.prisma.establecimiento.findFirst({ where: { id: establecimientoId, empresaId } });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    if (accesoEmpresaId) {
      const scoped = await this.prisma.accesoEstablecimiento.count({ where: { accesoEmpresaId } });
      if (scoped > 0) {
        const allowed = await this.prisma.accesoEstablecimiento.count({ where: { accesoEmpresaId, establecimientoId } });
        if (!allowed) throw new NotFoundException('Establecimiento no encontrado');
      }
    }
    return { establecimientoId };
  }

  /**
   * Obtener resumen general del dashboard
   */
  async getResumen(empresaId: string, filtros?: { fechaDesde?: Date; fechaHasta?: Date }, organizacionEmpresaId?: string, establecimientoId?: string, accesoEmpresaId?: string) {
    const establishment = await this.establishmentFilter(empresaId, establecimientoId, accesoEmpresaId);
    const whereDate = {
      ...(filtros?.fechaDesde && { fechaHoraInicio: { gte: filtros.fechaDesde } }),
      ...(filtros?.fechaHasta && { fechaHoraInicio: { lte: filtros.fechaHasta } }),
    };

    const [
      totalInspecciones,
      inspeccionesCompletadas,
      inspeccionesEnProgreso,
      totalHallazgos,
      hallazgosPorNivel,
      totalAcciones,
      accionesPorEstado,
      accionesVencidas,
    ] = await Promise.all([
      // Total inspecciones
      this.prisma.inspeccion.count({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, ...whereDate },
      }),
      // Inspecciones completadas
      this.prisma.inspeccion.count({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, estado: EstadoInspeccion.COMPLETADA, ...whereDate },
      }),
      // Inspecciones en progreso
      this.prisma.inspeccion.count({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, estado: EstadoInspeccion.EN_PROGRESO },
      }),
      // Total hallazgos
      this.prisma.hallazgo.count({
        where: { inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, ...whereDate } },
      }),
      // Hallazgos por nivel
      this.prisma.hallazgo.groupBy({
        by: ['nivelRiesgo'],
        _count: true,
        where: { inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, ...whereDate } },
      }),
      // Total acciones
      this.prisma.accionCorrectiva.count({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), hallazgo: { inspeccion: { ...establishment } } },
      }),
      // Acciones por estado
      this.prisma.accionCorrectiva.groupBy({
        by: ['estado'],
        _count: true,
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), hallazgo: { inspeccion: { ...establishment } } },
      }),
      // Acciones vencidas
      this.prisma.accionCorrectiva.count({
        where: {
          empresaId,
          ...(organizacionEmpresaId && { organizacionEmpresaId }),
          hallazgo: { inspeccion: { ...establishment } },
          fechaCompromiso: { lt: new Date() },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        },
      }),
    ]);

    // Calcular porcentaje de cumplimiento
    const porcentajeCumplimiento = totalInspecciones > 0
      ? Math.round((inspeccionesCompletadas / totalInspecciones) * 100)
      : 0;

    return {
      inspecciones: {
        total: totalInspecciones,
        completadas: inspeccionesCompletadas,
        enProgreso: inspeccionesEnProgreso,
        porcentajeCumplimiento,
      },
      hallazgos: {
        total: totalHallazgos,
        porNivel: this.formatGroupBy(hallazgosPorNivel, 'nivelRiesgo'),
      },
      accionesCorrectivas: {
        total: totalAcciones,
        porEstado: this.formatGroupBy(accionesPorEstado, 'estado'),
        vencidas: accionesVencidas,
      },
    };
  }

  /**
   * Obtener tendencias de inspecciones por período
   */
  async getTendencias(
    empresaId: string,
    periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
  ) {
    const establishment = await this.establishmentFilter(empresaId, establecimientoId, accesoEmpresaId);
    const fechaInicio = this.getFechaInicio(periodo);

    const inspecciones = await this.prisma.inspeccion.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...establishment,
        fechaHoraInicio: { gte: fechaInicio },
      },
      select: {
        fechaHoraInicio: true,
        estado: true,
      },
      orderBy: { fechaHoraInicio: 'asc' },
    });

    const hallazgos = await this.prisma.hallazgo.findMany({
      where: {
        inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment },
        createdAt: { gte: fechaInicio },
      },
      select: {
        createdAt: true,
        nivelRiesgo: true,
      },
    });

    // Agrupar por día/semana según período
    return {
      inspecciones: this.agruparPorFecha(inspecciones, 'fechaHoraInicio'),
      hallazgos: this.agruparPorFecha(hallazgos, 'createdAt'),
    };
  }

  /**
   * Obtener top sectores con más hallazgos
   */
  async getTopSectores(empresaId: string, limit: number = 5, organizacionEmpresaId?: string, establecimientoId?: string, accesoEmpresaId?: string) {
    const establishment = await this.establishmentFilter(empresaId, establecimientoId, accesoEmpresaId);
    const result = await this.prisma.inspeccion.groupBy({
      by: ['sector'],
      _count: {
        id: true,
      },
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...establishment,
        hallazgos: { some: {} },
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Obtener conteo de hallazgos por sector
    const sectoresConHallazgos = await Promise.all(
      result.map(async (item) => {
        const hallazgos = await this.prisma.hallazgo.count({
          where: {
            inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment, sector: item.sector },
          },
        });
        return {
          sector: item.sector,
          inspecciones: item._count.id,
          hallazgos,
        };
      }),
    );

    return sectoresConHallazgos;
  }

  /**
   * Obtener resumen de actividad reciente
   */
  async getActividadReciente(empresaId: string, limit: number = 10, organizacionEmpresaId?: string, establecimientoId?: string, accesoEmpresaId?: string) {
    const establishment = await this.establishmentFilter(empresaId, establecimientoId, accesoEmpresaId);
    const [inspecciones, hallazgos, acciones] = await Promise.all([
      this.prisma.inspeccion.findMany({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment },
        select: {
          id: true,
          sector: true,
          estado: true,
          fechaHoraInicio: true,
          usuario: { select: { nombre: true, apellido: true } },
          checklist: { select: { nombre: true } },
        },
        orderBy: { fechaHoraInicio: 'desc' },
        take: limit,
      }),
      this.prisma.hallazgo.findMany({
        where: { inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment } },
        select: {
          id: true,
          titulo: true,
          nivelRiesgo: true,
          createdAt: true,
          inspeccion: { select: { sector: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.accionCorrectiva.findMany({
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), hallazgo: { inspeccion: { ...establishment } } },
        select: {
          id: true,
          descripcion: true,
          estado: true,
          fechaCompromiso: true,
          hallazgo: { select: { titulo: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    return {
      inspecciones,
      hallazgos,
      acciones,
    };
  }

  /**
   * Obtener KPIs principales
   */
  async getKPIs(empresaId: string, organizacionEmpresaId?: string, establecimientoId?: string, accesoEmpresaId?: string) {
    const establishment = await this.establishmentFilter(empresaId, establecimientoId, accesoEmpresaId);
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Inspecciones este mes vs mes anterior
    const [inspeccionesMes, inspeccionesMesAnterior] = await Promise.all([
      this.prisma.inspeccion.count({
        where: {
          empresaId,
          ...(organizacionEmpresaId && { organizacionEmpresaId }),
          ...establishment,
          fechaHoraInicio: { gte: inicioMes },
          estado: EstadoInspeccion.COMPLETADA,
        },
      }),
      this.prisma.inspeccion.count({
        where: {
          empresaId,
          ...(organizacionEmpresaId && { organizacionEmpresaId }),
          ...establishment,
          fechaHoraInicio: { gte: inicioMesAnterior, lt: inicioMes },
          estado: EstadoInspeccion.COMPLETADA,
        },
      }),
    ]);

    // Tiempo promedio de resolución de acciones
    const accionesResueltas = await this.prisma.accionCorrectiva.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        hallazgo: { inspeccion: { ...establishment } },
        estado: EstadoAccion.RESUELTA,
        fechaCierre: { not: null },
      },
      select: {
        createdAt: true,
        fechaCierre: true,
      },
    });

    const tiempoPromedioResolucion = accionesResueltas.length > 0
      ? Math.round(
          accionesResueltas.reduce((sum, a) => {
            const dias = Math.ceil(
              (a.fechaCierre!.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24),
            );
            return sum + dias;
          }, 0) / accionesResueltas.length,
        )
      : 0;

    // Índice de criticidad (hallazgos críticos + altos / total)
    const [hallazgosCriticos, hallazgosTotal] = await Promise.all([
      this.prisma.hallazgo.count({
        where: {
          inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment },
          nivelRiesgo: { in: [NivelRiesgo.CRITICO, NivelRiesgo.ALTO] },
        },
      }),
      this.prisma.hallazgo.count({
          where: { inspeccion: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }), ...establishment } },
      }),
    ]);

    const indiceCriticidad = hallazgosTotal > 0
      ? Math.round((hallazgosCriticos / hallazgosTotal) * 100)
      : 0;

    return {
      inspeccionesMes,
      variacionMensual: inspeccionesMesAnterior > 0
        ? Math.round(((inspeccionesMes - inspeccionesMesAnterior) / inspeccionesMesAnterior) * 100)
        : 100,
      tiempoPromedioResolucion,
      indiceCriticidad,
    };
  }

  // Helpers
  private formatGroupBy(data: any[], key: string) {
    return data.reduce((acc, item) => {
      acc[item[key]] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private getFechaInicio(periodo: 'semana' | 'mes' | 'trimestre'): Date {
    const now = new Date();
    switch (periodo) {
      case 'semana':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'mes':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'trimestre':
        return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }
  }

  private agruparPorFecha(data: any[], campo: string) {
    const grupos: Record<string, number> = {};
    data.forEach((item) => {
      const fecha = new Date(item[campo]).toISOString().split('T')[0];
      grupos[fecha] = (grupos[fecha] || 0) + 1;
    });
    return grupos;
  }
}
