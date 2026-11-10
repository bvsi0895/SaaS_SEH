import apiClient from './client';
import type { AccionCorrectiva } from '../types';

export const accionesApi = {
  getMisAcciones: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas/me');
    return response.data;
  },

  getPendientes: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas', { params: { estado: 'PENDIENTE' } });
    return response.data;
  },

  getById: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.get<AccionCorrectiva>(`/acciones-correctivas/${id}`);
    return response.data;
  },

  iniciar: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.patch<AccionCorrectiva>(`/acciones-correctivas/${id}/iniciar`);
    return response.data;
  },

  resolver: async (id: string, evidenciaUrl?: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.post<AccionCorrectiva>(
      `/acciones-correctivas/${id}/cerrar`,
      { evidenciaUrl }
    );
    return response.data;
  },
};
