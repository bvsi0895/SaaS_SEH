import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { accionesApi } from '../../src/api/acciones';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusBadge from '../../src/components/StatusBadge';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize } from '../../src/constants/theme';

export default function AccionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: accion, isLoading } = useQuery({
    queryKey: ['accion', id],
    queryFn: () => accionesApi.getById(id!),
    enabled: !!id,
  });

  const iniciarMutation = useMutation({
    mutationFn: () => accionesApi.iniciar(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accion', id] });
      queryClient.invalidateQueries({ queryKey: ['acciones'] });
      Alert.alert('Exito', 'Accion iniciada correctamente');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo iniciar la accion');
    },
  });

  const resolverMutation = useMutation({
    mutationFn: () => accionesApi.resolver(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accion', id] });
      queryClient.invalidateQueries({ queryKey: ['acciones'] });
      Alert.alert('Exito', 'Accion resuelta correctamente');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo resolver la accion');
    },
  });

  const handleIniciar = () => {
    Alert.alert(
      'Iniciar Accion',
      'Deseas marcar esta accion como "En Progreso"?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar', onPress: () => iniciarMutation.mutate() },
      ]
    );
  };

  const handleResolver = () => {
    Alert.alert(
      'Resolver Accion',
      'Deseas marcar esta accion como "Resuelta"? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Resolver', onPress: () => resolverMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Cargando accion..." />;
  }

  if (!accion) {
    return (
      <View style={styles.errorContainer}>
        <Text>Accion no encontrada</Text>
      </View>
    );
  }

  const isVencida =
    new Date(accion.fechaCompromiso) < new Date() &&
    (accion.estado === 'PENDIENTE' || accion.estado === 'EN_PROGRESO');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Alerta de vencida */}
      {isVencida && (
        <Card style={styles.alertCard}>
          <View style={styles.alertContent}>
            <Ionicons name="alert-circle" size={24} color={colors.white} />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>Accion Vencida</Text>
              <Text style={styles.alertText}>
                La fecha de compromiso era el{' '}
                {new Date(accion.fechaCompromiso).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Info de la accion */}
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Estado</Text>
          <StatusBadge status={accion.estado} />
        </View>

        <Text style={styles.label}>Descripcion</Text>
        <Text style={styles.value}>{accion.descripcion}</Text>

        <Text style={styles.label}>Fecha de Compromiso</Text>
        <Text style={[styles.value, isVencida && styles.textVencida]}>
          {new Date(accion.fechaCompromiso).toLocaleDateString()}
        </Text>

        {accion.fechaCierre && (
          <>
            <Text style={styles.label}>Fecha de Cierre</Text>
            <Text style={styles.value}>
              {new Date(accion.fechaCierre).toLocaleDateString()}
            </Text>
          </>
        )}

        <Text style={styles.label}>Responsable</Text>
        <Text style={styles.value}>
          {accion.responsable
            ? `${accion.responsable.nombre} ${accion.responsable.apellido}`
            : accion.responsableTexto || 'Sin asignar'}
        </Text>
      </Card>

      {/* Hallazgo asociado */}
      {accion.hallazgo && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Hallazgo Asociado</Text>

          <View style={styles.hallazgoHeader}>
            <StatusBadge
              status={accion.hallazgo.nivelRiesgo}
              type="riesgo"
              size="small"
            />
            <Text style={styles.hallazgoTitulo}>{accion.hallazgo.titulo}</Text>
          </View>

          <Text style={styles.label}>Descripcion</Text>
          <Text style={styles.value}>{accion.hallazgo.descripcion}</Text>

          <Text style={styles.label}>Ubicacion</Text>
          <Text style={styles.value}>{accion.hallazgo.ubicacionTexto}</Text>
        </Card>
      )}

      {/* Botones de accion */}
      <View style={styles.actions}>
        {accion.estado === 'PENDIENTE' && (
          <Button
            title="Iniciar Accion"
            onPress={handleIniciar}
            loading={iniciarMutation.isPending}
            icon={<Ionicons name="play" size={20} color={colors.white} />}
          />
        )}

        {accion.estado === 'EN_PROGRESO' && (
          <Button
            title="Marcar como Resuelta"
            onPress={handleResolver}
            loading={resolverMutation.isPending}
            variant="secondary"
            icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />}
          />
        )}
      </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: colors.error,
    marginBottom: spacing.md,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  textVencida: {
    color: colors.error,
    fontWeight: '600',
  },
  hallazgoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hallazgoTitulo: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
