import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme';
import { statusColors, riskColors, cumplimientoColors } from '../constants/theme';

interface StatusBadgeProps {
  status: string;
  type?: 'estado' | 'riesgo' | 'cumplimiento';
  size?: 'small' | 'medium';
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
  OBSERVACION: 'Obs.',
};

export default function StatusBadge({
  status,
  type = 'estado',
  size = 'medium',
}: StatusBadgeProps) {
  let label = status;
  let backgroundColor = colors.gray;

  if (type === 'estado') {
    label = estadoLabels[status] || status;
    backgroundColor = statusColors[status as keyof typeof statusColors] || colors.gray;
  } else if (type === 'riesgo') {
    label = riesgoLabels[status] || status;
    backgroundColor = riskColors[status as keyof typeof riskColors] || colors.gray;
  } else if (type === 'cumplimiento') {
    label = cumplimientoLabels[status] || status;
    backgroundColor = cumplimientoColors[status as keyof typeof cumplimientoColors] || colors.gray;
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        size === 'small' && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.text, size === 'small' && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeSmall: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  text: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: fontSize.xs,
  },
});
