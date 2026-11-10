import apiClient from './client';

export interface EstablecimientoAutorizado {
  id: string;
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
}

export const reportesApi = {
  getEstablecimientos: async (): Promise<EstablecimientoAutorizado[]> =>
    (await apiClient.get<EstablecimientoAutorizado[]>('/auth/establecimientos')).data,
  descargarInformeMensual: async (params: { fechaDesde: string; fechaHasta: string; establecimientoId?: string }): Promise<Blob> =>
    (await apiClient.get('/reportes/mensual.pdf', { params, responseType: 'blob' })).data,
};
