import apiClient from './client';
import type { Hallazgo, NivelRiesgo } from '../types';

export interface CreateHallazgoDto {
  titulo: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo;
  ubicacionTexto: string;
  inspeccionId: string;
}

export const hallazgosApi = {
  create: async (data: CreateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.post<Hallazgo>('/hallazgos', data);
    return response.data;
  },

  uploadPhoto: async (id: string, uri: string): Promise<Hallazgo> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `hallazgo-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);
    const response = await apiClient.post<Hallazgo>(`/hallazgos/${id}/fotos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getByInspeccion: async (inspeccionId: string): Promise<Hallazgo[]> => {
    const response = await apiClient.get<Hallazgo[]>(`/hallazgos/inspeccion/${inspeccionId}`);
    return response.data;
  },

  getById: async (id: string): Promise<Hallazgo> => {
    const response = await apiClient.get<Hallazgo>(`/hallazgos/${id}`);
    return response.data;
  },
};

