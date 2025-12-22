export const colors = {
  primary: '#1976d2',
  primaryDark: '#1565c0',
  primaryLight: '#42a5f5',
  secondary: '#9c27b0',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  errorDark: '#b71c1c',
  gray: '#757575',
  lightGray: '#e0e0e0',
  background: '#f5f5f5',
  white: '#ffffff',
  black: '#000000',
  text: '#212121',
  textSecondary: '#757575',
};

export const riskColors = {
  BAJO: colors.success,
  MEDIO: colors.warning,
  ALTO: colors.error,
  CRITICO: colors.errorDark,
};

export const statusColors = {
  PENDIENTE: colors.gray,
  EN_PROGRESO: colors.primary,
  COMPLETADA: colors.success,
  CANCELADA: colors.error,
  RESUELTA: colors.success,
  VENCIDA: colors.error,
};

export const cumplimientoColors = {
  PENDIENTE: colors.gray,
  CUMPLE: colors.success,
  NO_CUMPLE: colors.error,
  NO_APLICA: colors.gray,
  OBSERVACION: colors.warning,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
