import apiClient from './client';
import type { DashboardKPIs, DashboardTrend, TopSector, ActividadReciente } from '../types';

export const dashboardApi = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    const response = await apiClient.get<DashboardKPIs>('/dashboard/kpis');
    return response.data;
  },

  getTendencias: async (meses?: number): Promise<DashboardTrend[]> => {
    const response = await apiClient.get<DashboardTrend[]>('/dashboard/tendencias', {
      params: { meses },
    });
    return response.data;
  },

  getTopSectores: async (limit?: number): Promise<TopSector[]> => {
    const response = await apiClient.get<TopSector[]>('/dashboard/top-sectores', {
      params: { limit },
    });
    return response.data;
  },

  getActividadReciente: async (limit?: number): Promise<ActividadReciente[]> => {
    const response = await apiClient.get<ActividadReciente[]>('/dashboard/actividad-reciente', {
      params: { limit },
    });
    return response.data;
  },
};
