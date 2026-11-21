import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import {
  CumplimientoItem,
  EstadoAccion,
  EstadoHallazgo,
  EstadoInspeccion,
  Rol,
} from '@prisma/client';

type DashboardPeriod = 'semana' | 'mes' | 'trimestre';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, @Optional() private tenancy?: TenancyService) {}

  private async establishmentFilter(
    empresaId: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
  ) {
    if (this.tenancy && accesoEmpresaId) {
      const scope = await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId);
      if (establecimientoId && scope !== undefined && !scope.includes(establecimientoId)) throw new NotFoundException('Establecimiento no encontrado');
      if (establecimientoId) return { establecimientoId };
      return scope === undefined ? {} : { establecimientoId: { in: scope } };
    }
    if (establecimientoId) {
      const establishment = await this.prisma.establecimiento.findFirst({
        where: { id: establecimientoId, empresaId },
        select: { id: true },
      });
      if (!establishment)
        throw new NotFoundException('Establecimiento no encontrado');
    }

    const scoped = accesoEmpresaId
      ? await this.prisma.accesoEstablecimiento.findMany({
          where: { accesoEmpresaId, establecimiento: { empresaId } },
          select: { establecimientoId: true },
        })
      : [];
    const allowedIds = scoped.map((item) => item.establecimientoId);

    if (
      establecimientoId &&
      allowedIds.length > 0 &&
      !allowedIds.includes(establecimientoId)
    ) {
      throw new NotFoundException('Establecimiento no encontrado');
    }
    if (establecimientoId) return { establecimientoId };
    // Legacy fallback is kept only for direct unit callers without tenancy context.
    return allowedIds.length > 0
      ? { establecimientoId: { in: allowedIds } }
      : {};
  }

  private async buildScope(
    empresaId: string,
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const establishment = await this.establishmentFilter(
      empresaId,
      establecimientoId,
      accesoEmpresaId,
    );
    const baseInspectionWhere = {
      empresaId,
      ...(organizacionEmpresaId && { organizacionEmpresaId }),
      ...establishment,
    };
    const inspectionWhere =
      rol === Rol.TECNICO && usuarioId
        ? { ...baseInspectionWhere, asignadoAId: usuarioId }
        : baseInspectionWhere;

    return {
      baseInspectionWhere,
      inspectionWhere,
      findingWhere: { inspeccion: inspectionWhere },
      // Technicians see findings from assigned inspections and actions assigned
      // to them even when those actions belong to another inspection.
      actionWhere: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(rol === Rol.TECNICO && usuarioId && { responsableId: usuarioId }),
        hallazgo: { inspeccion: baseInspectionWhere },
      },
    };
  }

  private getMonthBounds(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return {
      currentStart: new Date(Date.UTC(year, month, 1)),
      nextStart: new Date(Date.UTC(year, month + 1, 1)),
      previousStart: new Date(Date.UTC(year, month - 1, 1)),
    };
  }

  /**
   * Definitions: started inspections have fechaHoraInicio; pending inspections
   * are excluded. A finding is open while its lifecycle state is PENDIENTE or
   * EN_CORRECCION; SOLUCIONADO is the only closed state. Compliance is CUMPLE divided by all
   * evaluable items; NO_APLICA is excluded, while pending/NO_CUMPLE/OBSERVACION
   * remain in the denominator as not fulfilled.
   */
  async getResumen(
    empresaId: string,
    filtros?: { fechaDesde?: Date; fechaHasta?: Date },
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const scope = await this.buildScope(
      empresaId,
      organizacionEmpresaId,
      establecimientoId,
      accesoEmpresaId,
      usuarioId,
      rol,
    );
    const whereDate =
      filtros?.fechaDesde || filtros?.fechaHasta
        ? {
            fechaHoraInicio: {
              ...(filtros.fechaDesde && { gte: filtros.fechaDesde }),
              ...(filtros.fechaHasta && { lte: filtros.fechaHasta }),
            },
          }
        : {};
    const inspectionWhere = { ...scope.inspectionWhere, ...whereDate };
    const findingWhere = { inspeccion: inspectionWhere };
    const [
      totalInspecciones,
      inspeccionesIniciadas,
      inspeccionesCompletadas,
      inspeccionesEnProgreso,
      inspeccionesPendientes,
      hallazgos,
      hallazgosAbiertos,
      hallazgosPorNivel,
      hallazgosPorEstado,
      hallazgosSinAccion,
      acciones,
      accionesPorEstado,
      accionesVencidas,
      items,
    ] = await Promise.all([
      this.prisma.inspeccion.count({ where: inspectionWhere }),
      this.prisma.inspeccion.count({
        where: { ...inspectionWhere, fechaHoraInicio: { not: null } },
      }),
      this.prisma.inspeccion.count({
        where: { ...inspectionWhere, estado: EstadoInspeccion.COMPLETADA },
      }),
      this.prisma.inspeccion.count({
        where: { ...inspectionWhere, estado: EstadoInspeccion.EN_PROGRESO },
      }),
      this.prisma.inspeccion.count({
        where: { ...inspectionWhere, estado: EstadoInspeccion.PENDIENTE },
      }),
      this.prisma.hallazgo.count({ where: findingWhere }),
      this.prisma.hallazgo.count({
        where: {
          ...findingWhere,
          estado: { in: [EstadoHallazgo.PENDIENTE, EstadoHallazgo.EN_CORRECCION] },
        },
      }),
      this.prisma.hallazgo.groupBy({
        by: ['nivelRiesgo'],
        _count: true,
        where: findingWhere,
      }),
      this.prisma.hallazgo.groupBy({
        by: ['estado'],
        _count: true,
        where: findingWhere,
      }),
      this.prisma.hallazgo.count({
        where: { ...findingWhere, accionesCorrectivas: { none: {} } },
      }),
      this.prisma.accionCorrectiva.count({ where: scope.actionWhere }),
      this.prisma.accionCorrectiva.groupBy({
        by: ['estado'],
        _count: true,
        where: scope.actionWhere,
      }),
      this.prisma.accionCorrectiva.count({
        where: {
          ...scope.actionWhere,
          OR: [
            { estado: EstadoAccion.VENCIDA },
            {
              fechaCompromiso: { lt: new Date() },
              estado: {
                in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO],
              },
            },
          ],
        },
      }),
      this.prisma.inspeccionItem.findMany({
        where: { inspeccion: inspectionWhere },
        select: { cumplimiento: true },
      }),
    ]);

    const evaluableItems = items.filter(
      (item) => item.cumplimiento !== CumplimientoItem.NO_APLICA,
    ).length;
    const cumplidos = items.filter(
      (item) => item.cumplimiento === CumplimientoItem.CUMPLE,
    ).length;
    const porcentajeCumplimiento =
      evaluableItems > 0
        ? Math.round((cumplidos / evaluableItems) * 100)
        : null;

    return {
      inspecciones: {
        total: totalInspecciones,
        iniciadas: inspeccionesIniciadas,
        completadas: inspeccionesCompletadas,
        enProgreso: inspeccionesEnProgreso,
        pendientes: inspeccionesPendientes,
        porcentajeCumplimiento,
      },
      hallazgos: {
        total: hallazgos,
        abiertos: hallazgosAbiertos,
        sinAccion: hallazgosSinAccion,
        porNivel: this.formatGroupBy(hallazgosPorNivel, 'nivelRiesgo'),
        porEstado: this.formatGroupBy(hallazgosPorEstado, 'estado'),
      },
      accionesCorrectivas: {
        total: acciones,
        porEstado: this.formatGroupBy(accionesPorEstado, 'estado'),
        vencidas: accionesVencidas,
      },
    };
  }

  async getTendencias(
    empresaId: string,
    periodo: DashboardPeriod = 'mes',
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const scope = await this.buildScope(
      empresaId,
      organizacionEmpresaId,
      establecimientoId,
      accesoEmpresaId,
      usuarioId,
      rol,
    );
    const fechaInicio = this.getFechaInicio(periodo);
    const now = new Date();
    const [inspecciones, hallazgos] = await Promise.all([
      this.prisma.inspeccion.findMany({
        where: {
          ...scope.inspectionWhere,
          fechaHoraInicio: { gte: fechaInicio, lte: now },
        },
        select: { fechaHoraInicio: true },
        orderBy: { fechaHoraInicio: 'asc' },
      }),
      this.prisma.hallazgo.findMany({
        where: {
          ...scope.findingWhere,
          createdAt: { gte: fechaInicio, lte: now },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      inspecciones: this.agruparPorFecha(inspecciones, 'fechaHoraInicio'),
      hallazgos: this.agruparPorFecha(hallazgos, 'createdAt'),
    };
  }

  async getTopSectores(
    empresaId: string,
    limit = 5,
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const scope = await this.buildScope(
      empresaId,
      organizacionEmpresaId,
      establecimientoId,
      accesoEmpresaId,
      usuarioId,
      rol,
    );
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const sectors = await this.prisma.inspeccion.groupBy({
      by: ['sector'],
      where: { ...scope.inspectionWhere, hallazgos: { some: {} } },
      _count: { id: true },
    });
    const result = await Promise.all(
      sectors.map(async (item) => ({
        sector: item.sector,
        inspecciones: item._count.id,
        hallazgos: await this.prisma.hallazgo.count({
          where: {
            ...scope.findingWhere,
            inspeccion: { ...scope.inspectionWhere, sector: item.sector },
          },
        }),
      })),
    );
    return result
      .sort(
        (a, b) =>
          b.hallazgos - a.hallazgos ||
          b.inspecciones - a.inspecciones ||
          a.sector.localeCompare(b.sector),
      )
      .slice(0, safeLimit);
  }

  async getActividadReciente(
    empresaId: string,
    limit = 10,
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const scope = await this.buildScope(
      empresaId,
      organizacionEmpresaId,
      establecimientoId,
      accesoEmpresaId,
      usuarioId,
      rol,
    );
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const [inspecciones, hallazgos, acciones] = await Promise.all([
      this.prisma.inspeccion.findMany({
        where: scope.inspectionWhere,
        select: {
          id: true,
          sector: true,
          estado: true,
          fechaHoraInicio: true,
          createdAt: true,
          usuario: { select: { nombre: true, apellido: true } },
          checklist: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.hallazgo.findMany({
        where: scope.findingWhere,
        select: {
          id: true,
          titulo: true,
          nivelRiesgo: true,
          createdAt: true,
          inspeccion: { select: { sector: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.accionCorrectiva.findMany({
        where: scope.actionWhere,
        select: {
          id: true,
          descripcion: true,
          estado: true,
          createdAt: true,
          fechaCompromiso: true,
          hallazgo: { select: { titulo: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
    ]);
    return { inspecciones, hallazgos, acciones };
  }

  async getKPIs(
    empresaId: string,
    organizacionEmpresaId?: string,
    establecimientoId?: string,
    accesoEmpresaId?: string,
    usuarioId?: string,
    rol?: Rol,
  ) {
    const scope = await this.buildScope(
      empresaId,
      organizacionEmpresaId,
      establecimientoId,
      accesoEmpresaId,
      usuarioId,
      rol,
    );
    const { currentStart, nextStart, previousStart } = this.getMonthBounds();
    const [
      resumen,
      inspeccionesEsteMes,
      inspeccionesMesAnterior,
      completadasEsteMes,
    ] = await Promise.all([
      this.getResumen(
        empresaId,
        undefined,
        organizacionEmpresaId,
        establecimientoId,
        accesoEmpresaId,
        usuarioId,
        rol,
      ),
      this.prisma.inspeccion.count({
        where: {
          ...scope.inspectionWhere,
          fechaHoraInicio: { gte: currentStart, lt: nextStart },
        },
      }),
      this.prisma.inspeccion.count({
        where: {
          ...scope.inspectionWhere,
          fechaHoraInicio: { gte: previousStart, lt: currentStart },
        },
      }),
      this.prisma.inspeccion.count({
        where: {
          ...scope.inspectionWhere,
          estado: EstadoInspeccion.COMPLETADA,
          fechaHoraInicio: { gte: currentStart, lt: nextStart },
        },
      }),
    ]);
    const variacionMensual =
      inspeccionesMesAnterior === 0
        ? inspeccionesEsteMes === 0
          ? 0
          : null
        : Math.round(
            ((inspeccionesEsteMes - inspeccionesMesAnterior) /
              inspeccionesMesAnterior) *
              100,
          );
    const porNivel = resumen.hallazgos.porNivel;
    const porEstado = resumen.accionesCorrectivas.porEstado;
    return {
      inspeccionesEsteMes,
      inspeccionesMesAnterior,
      inspeccionesCompletadasEsteMes: completadasEsteMes,
      variacionMensual,
      hallazgosTotal: resumen.hallazgos.total,
      hallazgosAbiertos: resumen.hallazgos.abiertos,
      hallazgosCriticos: porNivel.CRITICO || 0,
      hallazgosAltos: porNivel.ALTO || 0,
      hallazgosEnCorreccion: resumen.hallazgos.porEstado[EstadoHallazgo.EN_CORRECCION] || 0,
      hallazgosSolucionados: resumen.hallazgos.porEstado[EstadoHallazgo.SOLUCIONADO] || 0,
      accionesTotal: resumen.accionesCorrectivas.total,
      accionesPendientes: porEstado.PENDIENTE || 0,
      accionesEnProgreso: porEstado.EN_PROGRESO || 0,
      accionesResueltas: porEstado.RESUELTA || 0,
      accionesVencidas: resumen.accionesCorrectivas.vencidas,
      tasaCumplimiento: resumen.inspecciones.porcentajeCumplimiento,
    };
  }

  private formatGroupBy(data: any[], key: string) {
    return data.reduce(
      (acc, item) => {
        acc[item[key]] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private getFechaInicio(periodo: DashboardPeriod): Date {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    switch (periodo) {
      case 'semana':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'trimestre':
        return new Date(Date.UTC(year, month - 2, 1));
      case 'mes':
        return new Date(Date.UTC(year, month, 1));
    }
  }

  private agruparPorFecha(data: any[], campo: string) {
    const grupos: Record<string, number> = {};
    data.forEach((item) => {
      if (!item[campo]) return;
      const fecha = new Date(item[campo]).toISOString().slice(0, 10);
      grupos[fecha] = (grupos[fecha] || 0) + 1;
    });
    return grupos;
  }
}
