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
  nombre?: string;
  apellido?: string;
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
    const response = await apiClient.patch<Usuario>(`/usuarios/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/usuarios/${id}`);
  },

  changePassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/usuarios/${id}/cambiar-password`, { newPassword });
  },

  getTecnicos: async (): Promise<Usuario[]> => {
    const response = await apiClient.get<Usuario[]>('/usuarios/tecnicos');
    return response.data;
  },
};
