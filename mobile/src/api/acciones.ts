import apiClient from './client';
import type { AccionCorrectiva } from '../types';

export const accionesApi = {
  getMisAcciones: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas/mis-acciones');
    return response.data;
  },

  getPendientes: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas/pendientes');
    return response.data;
  },

  getById: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.get<AccionCorrectiva>(`/acciones-correctivas/${id}`);
    return response.data;
  },

  iniciar: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.post<AccionCorrectiva>(`/acciones-correctivas/${id}/iniciar`);
    return response.data;
  },

  resolver: async (id: string, evidenciaUrl?: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.post<AccionCorrectiva>(
      `/acciones-correctivas/${id}/resolver`,
      { evidenciaUrl }
    );
    return response.data;
  },
};
