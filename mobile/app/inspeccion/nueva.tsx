import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { checklistsApi } from '../../src/api/checklists';
import { inspeccionesApi } from '../../src/api/inspecciones';
import Card from '../../src/components/Card';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';
import type { Checklist } from '../../src/types';

const tipoColors: Record<string, string> = {
  SEGURIDAD: colors.primary,
  HIGIENE: colors.success,
  AMBIENTAL: '#00796b',
  EPP: colors.secondary,
  INCENDIO: colors.error,
  OTRO: colors.gray,
};

export default function NuevaInspeccionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [sector, setSector] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists', 'activos'],
    queryFn: checklistsApi.getActivos,
  });

  const createMutation = useMutation({
    mutationFn: inspeccionesApi.create,
    onSuccess: (inspeccion) => {
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      router.replace(`/inspeccion/${inspeccion.id}`);
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear la inspeccion'
      );
    },
  });

  const handleCreate = () => {
    if (!selectedChecklist) {
      Alert.alert('Error', 'Selecciona un checklist');
      return;
    }
    if (!sector.trim()) {
      Alert.alert('Error', 'Ingresa el sector o area');
      return;
    }

    createMutation.mutate({
      checklistId: selectedChecklist.id,
      sector: sector.trim(),
      descripcion: descripcion.trim() || undefined,
    });
  };

  if (isLoading) {
    return <Loading fullScreen message="Cargando checklists..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Sector */}
      <Text style={styles.sectionTitle}>Sector / Area</Text>
      <Input
        placeholder="Ej: Planta de Produccion - Sector A"
        value={sector}
        onChangeText={setSector}
        leftIcon="location-outline"
      />

      {/* Descripcion */}
      <Text style={styles.sectionTitle}>Descripcion (opcional)</Text>
      <Input
        placeholder="Descripcion adicional..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />

      {/* Seleccion de Checklist */}
      <Text style={styles.sectionTitle}>Selecciona un Checklist</Text>
      {checklists && checklists.length > 0 ? (
        checklists.map((checklist) => (
          <TouchableOpacity
            key={checklist.id}
            style={[
              styles.checklistCard,
              selectedChecklist?.id === checklist.id && styles.checklistSelected,
            ]}
            onPress={() => setSelectedChecklist(checklist)}
            activeOpacity={0.7}
          >
            <View style={styles.checklistHeader}>
              <View
                style={[
                  styles.tipoBadge,
                  { backgroundColor: tipoColors[checklist.tipo] || colors.gray },
                ]}
              >
                <Text style={styles.tipoText}>{checklist.tipo}</Text>
              </View>
              {selectedChecklist?.id === checklist.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>
            <Text style={styles.checklistName}>{checklist.nombre}</Text>
            {checklist.descripcion && (
              <Text style={styles.checklistDesc} numberOfLines={2}>
                {checklist.descripcion}
              </Text>
            )}
            <Text style={styles.checklistItems}>
              {checklist.items?.length || 0} items
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="document-outline" size={40} color={colors.lightGray} />
          <Text style={styles.emptyText}>No hay checklists disponibles</Text>
        </Card>
      )}

      {/* Boton Crear */}
      <Button
        title="Iniciar Inspeccion"
        onPress={handleCreate}
        loading={createMutation.isPending}
        disabled={!selectedChecklist || !sector.trim()}
        style={styles.createButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checklistCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checklistSelected: {
    borderColor: colors.primary,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tipoBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tipoText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  checklistName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  checklistDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  checklistItems: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  createButton: {
    marginTop: spacing.lg,
  },
});
