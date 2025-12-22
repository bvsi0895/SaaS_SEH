import apiClient from './client';
import type { Hallazgo, NivelRiesgo } from '../types';

export interface CreateHallazgoDto {
  titulo: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo;
  ubicacionTexto: string;
  ubicacionGps?: string;
  fotosUrls?: string;
  inspeccionId: string;
}

export interface UpdateHallazgoDto {
  titulo?: string;
  descripcion?: string;
  nivelRiesgo?: NivelRiesgo;
  ubicacionTexto?: string;
}

export const hallazgosApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    nivelRiesgo?: string;
    inspeccionId?: string;
  }): Promise<{ data: Hallazgo[]; total: number }> => {
    const response = await apiClient.get('/hallazgos', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Hallazgo> => {
    const response = await apiClient.get<Hallazgo>(`/hallazgos/${id}`);
    return response.data;
  },

  create: async (data: CreateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.post<Hallazgo>('/hallazgos', data);
    return response.data;
  },

  update: async (id: string, data: UpdateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.patch<Hallazgo>(`/hallazgos/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/hallazgos/${id}`);
  },

  getByInspeccion: async (inspeccionId: string): Promise<Hallazgo[]> => {
    const response = await apiClient.get<Hallazgo[]>(`/hallazgos/inspeccion/${inspeccionId}`);
    return response.data;
  },

  getCriticos: async (): Promise<Hallazgo[]> => {
    const response = await apiClient.get<Hallazgo[]>('/hallazgos/criticos');
    return response.data;
  },
};
