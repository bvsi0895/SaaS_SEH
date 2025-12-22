import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { inspeccionesApi } from '../../src/api/inspecciones';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusBadge from '../../src/components/StatusBadge';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';
import type { CumplimientoItem, InspeccionItem } from '../../src/types';

const cumplimientoOptions: { value: CumplimientoItem; label: string; icon: string; color: string }[] = [
  { value: 'CUMPLE', label: 'Cumple', icon: 'checkmark-circle', color: colors.success },
  { value: 'NO_CUMPLE', label: 'No Cumple', icon: 'close-circle', color: colors.error },
  { value: 'OBSERVACION', label: 'Observacion', icon: 'alert-circle', color: colors.warning },
  { value: 'NO_APLICA', label: 'N/A', icon: 'remove-circle', color: colors.gray },
];

export default function InspeccionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState<InspeccionItem | null>(null);
  const [observacion, setObservacion] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [finalizarModalVisible, setFinalizarModalVisible] = useState(false);
  const [observacionesFinal, setObservacionesFinal] = useState('');

  const { data: inspeccion, isLoading } = useQuery({
    queryKey: ['inspeccion', id],
    queryFn: () => inspeccionesApi.getById(id!),
    enabled: !!id,
  });

  const registrarItemMutation = useMutation({
    mutationFn: ({
      itemId,
      cumplimiento,
      observacion,
    }: {
      itemId: string;
      cumplimiento: CumplimientoItem;
      observacion?: string;
    }) => inspeccionesApi.registrarItem(id!, itemId, { cumplimiento, observacion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
      setModalVisible(false);
      setSelectedItem(null);
      setObservacion('');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo registrar el item');
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: () => inspeccionesApi.finalizar(id!, observacionesFinal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      setFinalizarModalVisible(false);
      Alert.alert('Exito', 'Inspeccion finalizada correctamente');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo finalizar la inspeccion');
    },
  });

  const handleCumplimiento = (item: InspeccionItem, cumplimiento: CumplimientoItem) => {
    if (cumplimiento === 'OBSERVACION' || cumplimiento === 'NO_CUMPLE') {
      setSelectedItem({ ...item, cumplimiento });
      setModalVisible(true);
    } else {
      registrarItemMutation.mutate({ itemId: item.id, cumplimiento });
    }
  };

  const handleSaveObservacion = () => {
    if (selectedItem) {
      registrarItemMutation.mutate({
        itemId: selectedItem.id,
        cumplimiento: selectedItem.cumplimiento,
        observacion,
      });
    }
  };

  if (isLoading) {
    return <Loading fullScreen message="Cargando inspeccion..." />;
  }

  if (!inspeccion) {
    return (
      <View style={styles.errorContainer}>
        <Text>Inspeccion no encontrada</Text>
      </View>
    );
  }

  const itemsCompletados = inspeccion.items?.filter((i) => i.cumplimiento !== 'PENDIENTE').length || 0;
  const totalItems = inspeccion.items?.length || 0;
  const progreso = totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
  const isEditable = inspeccion.estado === 'EN_PROGRESO';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Info */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.sectorText}>{inspeccion.sector}</Text>
            <StatusBadge status={inspeccion.estado} />
          </View>
          <Text style={styles.checklistText}>{inspeccion.checklist?.nombre}</Text>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progreso}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {itemsCompletados}/{totalItems} ({progreso}%)
            </Text>
          </View>
        </Card>

        {/* Acciones rapidas */}
        {isEditable && (
          <View style={styles.quickActions}>
            <Button
              title="Registrar Hallazgo"
              variant="outline"
              size="small"
              onPress={() => router.push(`/hallazgo/nuevo?inspeccionId=${id}`)}
              icon={<Ionicons name="warning" size={16} color={colors.primary} />}
              style={styles.actionButton}
            />
          </View>
        )}

        {/* Hallazgos */}
        {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
          <Card style={styles.hallazgosCard}>
            <Text style={styles.hallazgosTitle}>
              Hallazgos ({inspeccion.hallazgos.length})
            </Text>
            {inspeccion.hallazgos.map((h) => (
              <View key={h.id} style={styles.hallazgoItem}>
                <StatusBadge status={h.nivelRiesgo} type="riesgo" size="small" />
                <Text style={styles.hallazgoText} numberOfLines={1}>
                  {h.titulo}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Items del Checklist */}
        <Text style={styles.sectionTitle}>Items del Checklist</Text>
        {inspeccion.items?.map((item, index) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{index + 1}.</Text>
              <Text style={styles.itemDesc}>{item.checklistItem?.descripcion}</Text>
            </View>

            {item.observacion && (
              <Text style={styles.itemObservacion}>Obs: {item.observacion}</Text>
            )}

            {isEditable ? (
              <View style={styles.cumplimientoButtons}>
                {cumplimientoOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.cumplimientoButton,
                      item.cumplimiento === option.value && {
                        backgroundColor: option.color,
                      },
                    ]}
                    onPress={() => handleCumplimiento(item, option.value)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={item.cumplimiento === option.value ? colors.white : option.color}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <StatusBadge status={item.cumplimiento} type="cumplimiento" size="small" />
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Boton Finalizar */}
      {isEditable && progreso === 100 && (
        <View style={styles.finalizarContainer}>
          <Button
            title="Finalizar Inspeccion"
            onPress={() => setFinalizarModalVisible(true)}
          />
        </View>
      )}

      {/* Modal Observacion */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Observacion</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe la observacion..."
              value={observacion}
              onChangeText={setObservacion}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => {
                  setModalVisible(false);
                  setSelectedItem(null);
                  setObservacion('');
                }}
                style={styles.modalButton}
              />
              <Button
                title="Guardar"
                onPress={handleSaveObservacion}
                loading={registrarItemMutation.isPending}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Finalizar */}
      <Modal visible={finalizarModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Inspeccion</Text>
            <Text style={styles.modalSubtitle}>
              Agrega observaciones finales (opcional)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Observaciones finales..."
              value={observacionesFinal}
              onChangeText={setObservacionesFinal}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setFinalizarModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title="Finalizar"
                onPress={() => finalizarMutation.mutate()}
                loading={finalizarMutation.isPending}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectorText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  checklistText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    minWidth: 70,
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  hallazgosCard: {
    marginBottom: spacing.md,
  },
  hallazgosTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hallazgoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  hallazgoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  itemNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  itemDesc: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  itemObservacion: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  cumplimientoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cumplimientoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finalizarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
