import apiClient from './client';
import type { DashboardKPIs, DashboardTrend, TopSector, ActividadReciente } from '../types';

export const dashboardApi = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    const [kpisResponse, resumenResponse] = await Promise.all([
      apiClient.get<{ inspeccionesMes: number; variacionMensual: number }>('/dashboard/kpis'),
      apiClient.get<{
        inspecciones: { porcentajeCumplimiento: number };
        hallazgos: { total: number; porNivel: Record<string, number> };
        accionesCorrectivas: { porEstado: Record<string, number>; vencidas: number };
      }>('/dashboard/resumen'),
    ]);
    const resumen = resumenResponse.data;
    const accionesPendientes =
      (resumen.accionesCorrectivas.porEstado.PENDIENTE || 0) +
      (resumen.accionesCorrectivas.porEstado.EN_PROGRESO || 0);
    return {
      inspeccionesEsteMes: kpisResponse.data.inspeccionesMes,
      inspeccionesMesAnterior: kpisResponse.data.variacionMensual === 100 ? 0 : 1,
      hallazgosAbiertos: resumen.hallazgos.total,
      hallazgosCriticos:
        (resumen.hallazgos.porNivel.CRITICO || 0) +
        (resumen.hallazgos.porNivel.ALTO || 0),
      accionesPendientes,
      accionesVencidas: resumen.accionesCorrectivas.vencidas,
      tasaCumplimiento: resumen.inspecciones.porcentajeCumplimiento,
    };
  },

  getTendencias: async (meses?: number): Promise<DashboardTrend[]> => {
    const response = await apiClient.get<{
      inspecciones: Record<string, number>;
      hallazgos: Record<string, number>;
    }>('/dashboard/tendencias', { params: { meses } });
    const fechas = new Set([
      ...Object.keys(response.data.inspecciones),
      ...Object.keys(response.data.hallazgos),
    ]);
    return [...fechas].sort().map((mes) => ({
      mes,
      inspecciones: response.data.inspecciones[mes] || 0,
      hallazgos: response.data.hallazgos[mes] || 0,
    }));
  },

  getTopSectores: async (limit?: number): Promise<TopSector[]> => {
    const response = await apiClient.get<TopSector[]>('/dashboard/top-sectores', {
      params: { limit },
    });
    return response.data;
  },

  getActividadReciente: async (limit?: number): Promise<ActividadReciente[]> => {
    const response = await apiClient.get<{
      inspecciones: Array<{
        id: string;
        sector: string;
        fechaHoraInicio: string;
        usuario: { nombre: string; apellido: string };
        checklist: { nombre: string };
      }>;
      hallazgos: Array<{
        id: string;
        titulo: string;
        createdAt: string;
        inspeccion: { sector: string };
      }>;
      acciones: Array<{
        id: string;
        descripcion: string;
        fechaCompromiso: string;
        hallazgo: { titulo: string };
      }>;
    }>('/dashboard/actividad-reciente', {
      params: { limit },
    });
    const { inspecciones, hallazgos, acciones } = response.data;
    return [
      ...inspecciones.map((item) => ({
        id: item.id,
        tipo: 'inspeccion' as const,
        descripcion: `Inspección ${item.checklist.nombre} - ${item.sector}`,
        fecha: item.fechaHoraInicio,
        usuario: `${item.usuario.nombre} ${item.usuario.apellido}`,
      })),
      ...hallazgos.map((item) => ({
        id: item.id,
        tipo: 'hallazgo' as const,
        descripcion: `Hallazgo: ${item.titulo} - ${item.inspeccion.sector}`,
        fecha: item.createdAt,
        usuario: 'Sistema',
      })),
      ...acciones.map((item) => ({
        id: item.id,
        tipo: 'accion' as const,
        descripcion: `Acción correctiva: ${item.descripcion}`,
        fecha: item.fechaCompromiso,
        usuario: 'Sistema',
      })),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },
};
