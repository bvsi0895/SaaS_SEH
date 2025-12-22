// Enums
export type Rol = 'ADMIN_EMPRESA' | 'SUPERVISOR' | 'TECNICO';
export type TipoChecklist = 'SEGURIDAD' | 'HIGIENE' | 'AMBIENTAL' | 'EPP' | 'INCENDIO' | 'OTRO';
export type EstadoInspeccion = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type CumplimientoItem = 'PENDIENTE' | 'CUMPLE' | 'NO_CUMPLE' | 'NO_APLICA' | 'OBSERVACION';
export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
export type EstadoAccion = 'PENDIENTE' | 'EN_PROGRESO' | 'RESUELTA' | 'VENCIDA';

// Entities
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  activa: boolean;
}

export interface ChecklistItem {
  id: string;
  descripcion: string;
  orden: number;
  obligatorio: boolean;
  checklistId: string;
}

export interface Checklist {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoChecklist;
  activo: boolean;
  empresaId: string;
  items?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InspeccionItem {
  id: string;
  cumplimiento: CumplimientoItem;
  observacion?: string;
  fotosUrls?: string;
  inspeccionId: string;
  checklistItemId: string;
  checklistItem?: ChecklistItem;
}

export interface Inspeccion {
  id: string;
  sector: string;
  descripcion?: string;
  estado: EstadoInspeccion;
  fechaHoraInicio: string;
  fechaHoraFin?: string;
  observaciones?: string;
  firmaUrl?: string;
  empresaId: string;
  usuarioId: string;
  checklistId: string;
  usuario?: Usuario;
  checklist?: Checklist;
  items?: InspeccionItem[];
  hallazgos?: Hallazgo[];
  _count?: {
    hallazgos: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Hallazgo {
  id: string;
  titulo: string;
  descripcion: string;
  nivelRiesgo: NivelRiesgo;
  ubicacionTexto: string;
  ubicacionGps?: string;
  fotosUrls?: string;
  inspeccionId: string;
  inspeccion?: Inspeccion;
  accionesCorrectivas?: AccionCorrectiva[];
  createdAt: string;
  updatedAt: string;
}

export interface AccionCorrectiva {
  id: string;
  descripcion: string;
  fechaCompromiso: string;
  fechaCierre?: string;
  estado: EstadoAccion;
  evidenciaUrl?: string;
  responsableTexto?: string;
  empresaId: string;
  hallazgoId: string;
  responsableId?: string;
  hallazgo?: Hallazgo;
  responsable?: Usuario;
  createdAt: string;
  updatedAt: string;
}

// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  empresaCuit?: string;
  empresaNombre?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Usuario;
}

// Dashboard
export interface DashboardKPIs {
  inspeccionesEsteMes: number;
  inspeccionesMesAnterior: number;
  hallazgosAbiertos: number;
  hallazgosCriticos: number;
  accionesPendientes: number;
  accionesVencidas: number;
  tasaCumplimiento: number;
}

export interface DashboardTrend {
  mes: string;
  inspecciones: number;
  hallazgos: number;
}

export interface TopSector {
  sector: string;
  inspecciones: number;
  hallazgos: number;
}

export interface ActividadReciente {
  id: string;
  tipo: 'inspeccion' | 'hallazgo' | 'accion';
  descripcion: string;
  fecha: string;
  usuario: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}
