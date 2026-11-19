import apiClient from './client';
import type {
  DashboardKPIs,
  DashboardTrend,
  TopSector,
  ActividadReciente,
} from '../types';

export interface DashboardFilters {
  establecimientoId?: string;
}

export const dashboardApi = {
  getKPIs: async (filters?: DashboardFilters): Promise<DashboardKPIs> => {
    const response = await apiClient.get<DashboardKPIs>('/dashboard/kpis', {
      params: filters,
    });
    return response.data;
  },

  getTendencias: async (
    periodo: 'semana' | 'mes' | 'trimestre' = 'mes',
    filters?: DashboardFilters,
  ): Promise<DashboardTrend[]> => {
    const response = await apiClient.get<{
      inspecciones: Record<string, number>;
      hallazgos: Record<string, number>;
    }>('/dashboard/tendencias', { params: { periodo, ...filters } });
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

  getTopSectores: async (
    limit?: number,
    filters?: DashboardFilters,
  ): Promise<TopSector[]> => {
    const response = await apiClient.get<TopSector[]>(
      '/dashboard/top-sectores',
      {
        params: { limit, ...filters },
      },
    );
    return response.data;
  },

  getActividadReciente: async (
    limit?: number,
    filters?: DashboardFilters,
  ): Promise<ActividadReciente[]> => {
    const response = await apiClient.get<{
      inspecciones: Array<{
        id: string;
        sector: string;
        fechaHoraInicio: string | null;
        createdAt: string;
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
        createdAt: string;
        fechaCompromiso: string;
        hallazgo: { titulo: string };
      }>;
    }>('/dashboard/actividad-reciente', {
      params: { limit, ...filters },
    });
    const { inspecciones, hallazgos, acciones } = response.data;
    return [
      ...inspecciones.map((item) => ({
        id: item.id,
        tipo: 'inspeccion' as const,
        descripcion: `Inspección ${item.checklist.nombre} - ${item.sector}`,
        // A pending inspection has no real start; activity falls back to creation time.
        fecha: item.fechaHoraInicio ?? item.createdAt,
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
        fecha: item.createdAt,
        usuario: 'Sistema',
      })),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },
};
