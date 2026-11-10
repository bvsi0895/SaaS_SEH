import apiClient from './client';
import type { LoginCredentials, AuthResponse, Usuario, ContextoAutorizado } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<Usuario> => {
    const response = await apiClient.get<Usuario>('/auth/me');
    return response.data;
  },

  getContexts: async (): Promise<ContextoAutorizado[]> => {
    const response = await apiClient.get<ContextoAutorizado[]>('/auth/contextos');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
