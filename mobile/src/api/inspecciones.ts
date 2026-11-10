import apiClient from './client';
import type { Inspeccion, InspeccionItem, CumplimientoItem } from '../types';

export interface CreateInspeccionDto {
  checklistId: string;
  sector: string;
  descripcion?: string;
}

export const inspeccionesApi = {
  getMisInspecciones: async (): Promise<Inspeccion[]> => {
    const response = await apiClient.get<Inspeccion[]>('/inspecciones/me');
    return response.data;
  },

  getEnProgreso: async (): Promise<Inspeccion[]> => {
    const response = await apiClient.get<Inspeccion[]>('/inspecciones/me', { params: { estado: 'EN_PROGRESO' } });
    return response.data;
  },

  getById: async (id: string): Promise<Inspeccion> => {
    const response = await apiClient.get<Inspeccion>(`/inspecciones/${id}`);
    return response.data;
  },

  create: async (data: CreateInspeccionDto): Promise<Inspeccion> => {
    const response = await apiClient.post<Inspeccion>('/inspecciones', data);
    return response.data;
  },

  registrarItem: async (
    inspeccionId: string,
    itemId: string,
    data: { cumplimiento: CumplimientoItem; observacion?: string }
  ): Promise<InspeccionItem> => {
    const response = await apiClient.patch<InspeccionItem>(
      `/inspecciones/${inspeccionId}/item`,
      { inspeccionItemId: itemId, ...data }
    );
    return response.data;
  },

  finalizar: async (id: string, observaciones?: string): Promise<Inspeccion> => {
    const response = await apiClient.post<Inspeccion>(`/inspecciones/${id}/finalizar`, {
      observaciones,
    });
    return response.data;
  },

  cancelar: async (id: string): Promise<Inspeccion> => {
    const response = await apiClient.post<Inspeccion>(`/inspecciones/${id}/cancelar`);
    return response.data;
  },
};
