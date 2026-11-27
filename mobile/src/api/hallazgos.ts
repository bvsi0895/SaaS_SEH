import apiClient from './client';
import type { Hallazgo, NivelRiesgo } from '../types';

export interface CreateHallazgoDto {
  titulo: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo;
  ubicacionTexto: string;
  inspeccionId: string;
}

export interface HallazgoPhoto {
  uri: string;
  fileSize?: number;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const hallazgosApi = {
  create: async (data: CreateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.post<Hallazgo>('/hallazgos', data);
    return response.data;
  },

  uploadPhoto: async (id: string, photo: HallazgoPhoto): Promise<Hallazgo> => {
    if (photo.fileSize !== undefined && photo.fileSize > MAX_PHOTO_BYTES) {
      throw new Error('La fotografía supera el límite permitido de 5 MiB');
    }
    const formData = new FormData();
    formData.append('file', {
      uri: photo.uri,
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

