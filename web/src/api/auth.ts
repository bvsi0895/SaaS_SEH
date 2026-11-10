import apiClient from './client';
import type { LoginCredentials, RegisterData, AuthResponse, Usuario, ContextoAutorizado } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getProfile: async (): Promise<Usuario> => {
    const response = await apiClient.get<Usuario>('/auth/me');
    return response.data;
  },

  getContexts: async (): Promise<ContextoAutorizado[]> => {
    const response = await apiClient.get<ContextoAutorizado[]>('/auth/contextos');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.patch('/usuarios/me/password', { currentPassword, newPassword });
  },
};
