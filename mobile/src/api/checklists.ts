import apiClient from './client';
import type { Checklist } from '../types';

export const checklistsApi = {
  getActivos: async (): Promise<Checklist[]> => {
    const response = await apiClient.get<Checklist[]>('/checklists', {
      params: { activo: true },
    });
    return response.data;
  },

  getById: async (id: string): Promise<Checklist> => {
    const response = await apiClient.get<Checklist>(`/checklists/${id}`);
    return response.data;
  },
};
