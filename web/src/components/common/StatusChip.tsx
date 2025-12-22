import { Chip, ChipProps } from '@mui/material';
import { statusColors, riskColors } from '../../theme';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: string;
  type?: 'estado' | 'riesgo' | 'cumplimiento';
}

const estadoLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  RESUELTA: 'Resuelta',
  VENCIDA: 'Vencida',
};

const riesgoLabels: Record<string, string> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  CRITICO: 'Critico',
};

const cumplimientoLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CUMPLE: 'Cumple',
  NO_CUMPLE: 'No Cumple',
  NO_APLICA: 'N/A',
  OBSERVACION: 'Observacion',
};

const cumplimientoColors: Record<string, string> = {
  PENDIENTE: '#9e9e9e',
  CUMPLE: '#2e7d32',
  NO_CUMPLE: '#d32f2f',
  NO_APLICA: '#757575',
  OBSERVACION: '#ed6c02',
};

export default function StatusChip({ status, type = 'estado', ...props }: StatusChipProps) {
  let label = status;
  let backgroundColor = '#9e9e9e';

  if (type === 'estado') {
    label = estadoLabels[status] || status;
    backgroundColor = statusColors[status as keyof typeof statusColors] || '#9e9e9e';
  } else if (type === 'riesgo') {
    label = riesgoLabels[status] || status;
    backgroundColor = riskColors[status as keyof typeof riskColors] || '#9e9e9e';
  } else if (type === 'cumplimiento') {
    label = cumplimientoLabels[status] || status;
    backgroundColor = cumplimientoColors[status] || '#9e9e9e';
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor,
        color: 'white',
        fontWeight: 500,
      }}
      {...props}
    />
  );
}
