// Enums
export type Rol = 'ADMIN_EMPRESA' | 'SUPERVISOR' | 'TECNICO';
export type TipoChecklist = 'GENERAL' | 'EPP' | 'ORDEN_LIMPIEZA' | 'RIESGO_QUIMICO' | 'MAQUINARIA' | 'ERGONOMIA' | 'INCENDIO' | 'OTRO';
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
}

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  logoUrl?: string;
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
  items?: ChecklistItem[];
}

export interface InspeccionItem {
  id: string;
  cumplimiento: CumplimientoItem;
  observacion?: string;
  fotosUrls?: string;
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
  usuario?: Usuario;
  checklist?: Checklist;
  items?: InspeccionItem[];
  hallazgos?: Hallazgo[];
  _count?: { hallazgos: number };
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
}

export interface AccionCorrectiva {
  id: string;
  descripcion: string;
  fechaCompromiso: string;
  fechaCierre?: string;
  estado: EstadoAccion;
  hallazgo?: Hallazgo;
  responsable?: Usuario;
  responsableTexto?: string;
}

// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

// Dashboard
export interface DashboardStats {
  inspeccionesHoy: number;
  inspeccionesEnProgreso: number;
  hallazgosPendientes: number;
  accionesPendientes: number;
}
