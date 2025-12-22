import apiClient from './client';
import type { LoginCredentials, AuthResponse, Usuario } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<Usuario> => {
    const response = await apiClient.get<Usuario>('/auth/profile');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
