import apiClient from './client';
import type { Checklist, ChecklistItem, TipoChecklist } from '../types';

export interface CreateChecklistDto {
  nombre: string;
  descripcion?: string;
  tipo: TipoChecklist;
}

export interface CreateChecklistItemDto {
  descripcion: string;
  orden: number;
  obligatorio?: boolean;
}

export interface ReorderItemsDto {
  items: { id: string; orden: number }[];
}

export const checklistsApi = {
  getAll: async (params?: { activo?: boolean }): Promise<Checklist[]> => {
    const response = await apiClient.get<Checklist[]>('/checklists', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Checklist> => {
    const response = await apiClient.get<Checklist>(`/checklists/${id}`);
    return response.data;
  },

  create: async (data: CreateChecklistDto): Promise<Checklist> => {
    const response = await apiClient.post<Checklist>('/checklists', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateChecklistDto>): Promise<Checklist> => {
    const response = await apiClient.put<Checklist>(`/checklists/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/checklists/${id}`);
  },

  duplicate: async (id: string, nombre: string): Promise<Checklist> => {
    const response = await apiClient.post<Checklist>(`/checklists/${id}/duplicate`, { nombre });
    return response.data;
  },

  // Items
  addItem: async (checklistId: string, data: CreateChecklistItemDto): Promise<ChecklistItem> => {
    const response = await apiClient.post<ChecklistItem>(`/checklists/${checklistId}/items`, data);
    return response.data;
  },

  updateItem: async (
    _checklistId: string,
    itemId: string,
    data: Partial<CreateChecklistItemDto>
  ): Promise<ChecklistItem> => {
    const response = await apiClient.patch<ChecklistItem>(
      `/checklists/items/${itemId}`,
      data
    );
    return response.data;
  },

  deleteItem: async (_checklistId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/checklists/items/${itemId}`);
  },

  reorderItems: async (checklistId: string, data: ReorderItemsDto): Promise<void> => {
    await apiClient.patch(`/checklists/${checklistId}/reorder`, data.items);
  },
};
