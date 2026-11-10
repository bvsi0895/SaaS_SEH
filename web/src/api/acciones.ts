import apiClient from './client';
import type { AccionCorrectiva, EstadoAccion } from '../types';

export interface CreateAccionDto {
  descripcion: string;
  fechaCompromiso: string;
  hallazgoId: string;
  responsableId?: string;
  responsableTexto?: string;
}

export interface UpdateAccionDto {
  descripcion?: string;
  fechaCompromiso?: string;
  responsableId?: string;
  responsableTexto?: string;
}

export const accionesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    estado?: EstadoAccion;
    responsableId?: string;
  }): Promise<{ data: AccionCorrectiva[]; total: number }> => {
    const response = await apiClient.get('/acciones-correctivas', { params });
    return response.data;
  },

  getById: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.get<AccionCorrectiva>(`/acciones-correctivas/${id}`);
    return response.data;
  },

  create: async (data: CreateAccionDto): Promise<AccionCorrectiva> => {
    const response = await apiClient.post<AccionCorrectiva>('/acciones-correctivas', data);
    return response.data;
  },

  update: async (id: string, data: UpdateAccionDto): Promise<AccionCorrectiva> => {
    const response = await apiClient.put<AccionCorrectiva>(`/acciones-correctivas/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/acciones-correctivas/${id}`);
  },

  iniciar: async (id: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.patch<AccionCorrectiva>(
      `/acciones-correctivas/${id}/iniciar`
    );
    return response.data;
  },

  resolver: async (id: string, evidenciaUrl?: string): Promise<AccionCorrectiva> => {
    const response = await apiClient.post<AccionCorrectiva>(
      `/acciones-correctivas/${id}/cerrar`,
      { evidenciaUrl }
    );
    return response.data;
  },

  getMisAcciones: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas/me');
    return response.data;
  },

  getPendientes: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas', { params: { estado: 'PENDIENTE' } });
    return response.data;
  },

  getVencidas: async (): Promise<AccionCorrectiva[]> => {
    const response = await apiClient.get<AccionCorrectiva[]>('/acciones-correctivas', { params: { vencidas: true } });
    return response.data;
  },
};
