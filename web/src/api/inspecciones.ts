import apiClient from './client';
import type { Inspeccion, InspeccionItem } from '../types';

export interface CreateInspeccionDto {
  checklistId: string;
  sector: string;
  descripcion?: string;
}

export interface RegistrarItemDto {
  cumplimiento: string;
  observacion?: string;
}

export interface FinalizarInspeccionDto {
  observaciones?: string;
  firmaBase64?: string;
}

export const inspeccionesApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    estado?: string;
    checklistId?: string;
  }): Promise<{ data: Inspeccion[]; total: number }> => {
    const response = await apiClient.get<Inspeccion[] | { data: Inspeccion[]; total: number }>(
      '/inspecciones',
      { params },
    );
    return Array.isArray(response.data)
      ? { data: response.data, total: response.data.length }
      : response.data;
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
    data: RegistrarItemDto
  ): Promise<InspeccionItem> => {
    const response = await apiClient.patch<InspeccionItem>(
      `/inspecciones/${inspeccionId}/item`,
      { inspeccionItemId: itemId, ...data }
    );
    return response.data;
  },

  finalizar: async (id: string, data: FinalizarInspeccionDto): Promise<Inspeccion> => {
    const response = await apiClient.post<Inspeccion>(`/inspecciones/${id}/finalizar`, data);
    return response.data;
  },

  cancelar: async (id: string): Promise<Inspeccion> => {
    const response = await apiClient.post<Inspeccion>(`/inspecciones/${id}/cancelar`);
    return response.data;
  },

  getMisInspecciones: async (): Promise<Inspeccion[]> => {
    const response = await apiClient.get<Inspeccion[]>('/inspecciones/me');
    return response.data;
  },

  getEnProgreso: async (): Promise<Inspeccion[]> => {
    const response = await apiClient.get<Inspeccion[]>('/inspecciones/me', { params: { estado: 'EN_PROGRESO' } });
    return response.data;
  },

  getPDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/reportes/inspecciones/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
