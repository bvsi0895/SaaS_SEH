import apiClient from './client';
import type { Usuario, Rol } from '../types';

export interface CreateUsuarioDto {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}

export interface UpdateUsuarioDto {
  rol?: Rol;
  activo?: boolean;
}

export const usuariosApi = {
  getAll: async (): Promise<Usuario[]> => {
    const response = await apiClient.get<Usuario[]>('/usuarios');
    return response.data;
  },

  getById: async (id: string): Promise<Usuario> => {
    const response = await apiClient.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  create: async (data: CreateUsuarioDto): Promise<Usuario> => {
    const response = await apiClient.post<Usuario>('/usuarios', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUsuarioDto): Promise<Usuario> => {
    const response = await apiClient.put<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/usuarios/${id}`);
  },

  getTecnicos: async (): Promise<Usuario[]> => {
    const response = await apiClient.get<Usuario[]>('/usuarios/tecnicos');
    return response.data;
  },

  getResponsablesResolucion: async (establecimientoId?: string): Promise<Usuario[]> => {
    const response = await apiClient.get<Usuario[]>('/usuarios/responsables-resolucion', {
      params: establecimientoId ? { establecimientoId } : undefined,
    });
    return response.data;
  },
};
