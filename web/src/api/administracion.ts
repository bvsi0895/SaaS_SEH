import apiClient from './client';
import type { EmpresaCliente, EstadoRelacionEmpresa, Establecimiento, Organizacion, OrganizacionEmpresaView, OrganizacionMiembroView, Rol, RolOrganizacion } from '../types';

export interface UpdateOrganizacionDto { nombre?: string; logoUrl?: string; emailContacto?: string; telefono?: string; direccion?: string; }
export interface CreateEmpresaDto { nombre: string; cuit?: string; direccion?: string; telefono?: string; email?: string; }
export interface CreateEstablecimientoDto { nombre: string; codigo?: string; direccion?: string; sectores?: string; }

export const administracionApi = {
  getOrganization: async () => (await apiClient.get<Organizacion>('/organizaciones/me')).data,
  updateOrganization: async (data: UpdateOrganizacionDto) => (await apiClient.patch<Organizacion>('/organizaciones/me', data)).data,
  getMembers: async () => (await apiClient.get<OrganizacionMiembroView[]>('/organizaciones/me/miembros')).data,
  addMember: async (data: { email: string; rol: RolOrganizacion; rolOperativo?: Rol }) => (await apiClient.post('/organizaciones/me/miembros', data)).data,
  revokeMember: async (id: string) => (await apiClient.post(`/organizaciones/me/miembros/${id}/revocar`)).data,
  getCompanies: async () => (await apiClient.get<OrganizacionEmpresaView[]>('/organizaciones/me/empresas')).data,
  createCompany: async (data: CreateEmpresaDto) => (await apiClient.post<OrganizacionEmpresaView>('/organizaciones/me/empresas', data)).data,
  linkCompany: async (empresaId: string) => (await apiClient.post<OrganizacionEmpresaView>('/organizaciones/me/empresas/vincular', { empresaId })).data,
  updateCompanyRelation: async (id: string, estado: EstadoRelacionEmpresa) => (await apiClient.patch(`/organizaciones/me/empresas/${id}`, { estado })).data,
  updateCompany: async (id: string, data: CreateEmpresaDto) => (await apiClient.patch<EmpresaCliente>(`/organizaciones/me/empresas/${id}/datos`, data)).data,
  getEstablishments: async (id: string) => (await apiClient.get<Establecimiento[]>(`/organizaciones/me/empresas/${id}/establecimientos`)).data,
  createEstablishment: async (id: string, data: CreateEstablecimientoDto) => (await apiClient.post<Establecimiento>(`/organizaciones/me/empresas/${id}/establecimientos`, data)).data,
  updateEstablishment: async (relationId: string, id: string, data: Partial<CreateEstablecimientoDto> & { activo?: boolean }) => (await apiClient.patch<Establecimiento>(`/organizaciones/me/empresas/${relationId}/establecimientos/${id}`, data)).data,
  getAssignments: async (id: string) => (await apiClient.get(`/organizaciones/me/empresas/${id}/asignaciones`)).data,
  assign: async (id: string, organizacionMiembroId: string, rol: Rol) => (await apiClient.post(`/organizaciones/me/empresas/${id}/asignaciones`, { organizacionMiembroId, rol })).data,
  revokeAssignment: async (relationId: string, accessId: string) => (await apiClient.post(`/organizaciones/me/empresas/${relationId}/asignaciones/${accessId}/revocar`)).data,
};
