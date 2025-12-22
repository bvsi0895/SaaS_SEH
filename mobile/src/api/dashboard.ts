import apiClient from './client';
import type { DashboardStats } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboard/kpis');
    return {
      inspeccionesHoy: response.data.inspeccionesEsteMes || 0,
      inspeccionesEnProgreso: 0,
      hallazgosPendientes: response.data.hallazgosAbiertos || 0,
      accionesPendientes: response.data.accionesPendientes || 0,
    };
  },
};
