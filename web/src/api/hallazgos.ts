import apiClient from './client';
import type { Hallazgo, NivelRiesgo } from '../types';

export interface CreateHallazgoDto {
  titulo: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo;
  ubicacionTexto: string;
  ubicacionGps?: string;
  fotosUrls?: string[];
  inspeccionId: string;
  inspeccionItemId?: string;
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
  }): Promise<{ data: Hallazgo[]; total: number; isPaginated: boolean }> => {
    const response = await apiClient.get<Hallazgo[] | { data: Hallazgo[]; total: number }>(
      '/hallazgos',
      { params },
    );
    return Array.isArray(response.data)
      ? { data: response.data, total: response.data.length, isPaginated: false }
      : { ...response.data, isPaginated: true };
  },

  getById: async (id: string): Promise<Hallazgo> => {
    const response = await apiClient.get<Hallazgo>(`/hallazgos/${id}`);
    return response.data;
  },

  create: async (data: CreateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.post<Hallazgo>('/hallazgos', data);
    return response.data;
  },

  uploadPhoto: async (
    id: string,
    file: File,
    onUploadProgress?: (progress: number) => void,
  ): Promise<Hallazgo> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<Hallazgo>(`/hallazgos/${id}/fotos`, formData, {
      onUploadProgress: (event) => {
        if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  },

  getPhoto: async (id: string, filename: string): Promise<Blob> => {
    const response = await apiClient.get(`/hallazgos/${id}/fotos/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  update: async (id: string, data: UpdateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.put<Hallazgo>(`/hallazgos/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/hallazgos/${id}`);
  },

  getByInspeccion: async (inspeccionId: string): Promise<Hallazgo[]> => {
    const response = await apiClient.get<Hallazgo[]>('/hallazgos', { params: { inspeccionId } });
    return response.data;
  },

  getCriticos: async (): Promise<Hallazgo[]> => {
    const response = await apiClient.get<Hallazgo[]>('/hallazgos', { params: { nivelRiesgo: 'CRITICO' } });
    return response.data;
  },
};
