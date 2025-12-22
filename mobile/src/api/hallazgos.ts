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

export const hallazgosApi = {
  create: async (data: CreateHallazgoDto): Promise<Hallazgo> => {
    const response = await apiClient.post<Hallazgo>('/hallazgos', data);
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
