import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { Usuario, LoginCredentials, ContextoAutorizado } from '../types';
import { syncUserWithContext } from './contextRole';

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  contextos: ContextoAutorizado[];
  activeContextId: string | null;
  selectContext: (contextId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contextos, setContextos] = useState<ContextoAutorizado[]>([]);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loadContexts = useCallback(async (userToSync: Usuario | null = null) => {
    const available = await authApi.getContexts();
    const saved = await SecureStore.getItemAsync('activeOrganizacionEmpresaId');
    const selected = available.some((context) => context.organizacionEmpresaId === saved)
      ? saved
      : available[0]?.organizacionEmpresaId || null;
    const selectedContext = available.find((context) => context.organizacionEmpresaId === selected);
    setContextos(available);
    setActiveContextId(selected);
    if (userToSync) setUser(syncUserWithContext(userToSync, selectedContext));
    if (selected) await SecureStore.setItemAsync('activeOrganizacionEmpresaId', selected);
    else await SecureStore.deleteItemAsync('activeOrganizacionEmpresaId');
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const userData = await authApi.getProfile();
      await loadContexts(userData);
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('activeOrganizacionEmpresaId');
      setContextos([]);
      setActiveContextId(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadContexts]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    await loadContexts(response.usuario);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignorar errores de logout
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('activeOrganizacionEmpresaId');
      setUser(null);
      setContextos([]);
      setActiveContextId(null);
    }
  };

  const selectContext = async (contextId: string) => {
    if (!contextos.some((context) => context.organizacionEmpresaId === contextId)) {
      throw new Error('Contexto no autorizado');
    }
    const selectedContext = contextos.find((context) => context.organizacionEmpresaId === contextId);
    await SecureStore.setItemAsync('activeOrganizacionEmpresaId', contextId);
    setActiveContextId(contextId);
    setUser((currentUser) => syncUserWithContext(currentUser, selectedContext));
    queryClient.clear();
    await loadContexts(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        contextos,
        activeContextId,
        selectContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
