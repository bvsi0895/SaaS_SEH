import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { dashboardApi } from '../../src/api/dashboard';
import { inspeccionesApi } from '../../src/api/inspecciones';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusBadge from '../../src/components/StatusBadge';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  const {
    data: inspeccionesEnProgreso,
    isLoading: inspeccionesLoading,
    refetch: refetchInspecciones,
  } = useQuery({
    queryKey: ['inspecciones', 'en-progreso'],
    queryFn: inspeccionesApi.getEnProgreso,
  });

  const onRefresh = async () => {
    await Promise.all([refetchStats(), refetchInspecciones()]);
  };

  const isLoading = statsLoading || inspeccionesLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.nombre}</Text>
        <Text style={styles.subGreeting}>Bienvenido al sistema SEH</Text>
      </View>

      {/* Quick Actions */}
      <Card style={styles.quickActions}>
        <Button
          title="Nueva Inspeccion"
          onPress={() => router.push('/inspeccion/nueva')}
          icon={<Ionicons name="add-circle" size={20} color={colors.white} />}
        />
      </Card>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Resumen</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="clipboard-outline" size={28} color={colors.primary} />
          <Text style={styles.statNumber}>{stats?.inspeccionesHoy || 0}</Text>
          <Text style={styles.statLabel}>Inspecciones</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="warning-outline" size={28} color={colors.warning} />
          <Text style={styles.statNumber}>{stats?.hallazgosPendientes || 0}</Text>
          <Text style={styles.statLabel}>Hallazgos</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="construct-outline" size={28} color={colors.secondary} />
          <Text style={styles.statNumber}>{stats?.accionesPendientes || 0}</Text>
          <Text style={styles.statLabel}>Acciones</Text>
        </Card>
      </View>

      {/* Inspecciones en Progreso */}
      <Text style={styles.sectionTitle}>En Progreso</Text>
      {inspeccionesEnProgreso && inspeccionesEnProgreso.length > 0 ? (
        inspeccionesEnProgreso.map((inspeccion) => (
          <Card
            key={inspeccion.id}
            style={styles.inspeccionCard}
            onPress={() => router.push(`/inspeccion/${inspeccion.id}`)}
          >
            <View style={styles.inspeccionHeader}>
              <Text style={styles.inspeccionSector}>{inspeccion.sector}</Text>
              <StatusBadge status={inspeccion.estado} size="small" />
            </View>
            <Text style={styles.inspeccionChecklist}>
              {inspeccion.checklist?.nombre}
            </Text>
            <View style={styles.inspeccionFooter}>
              <Ionicons name="time-outline" size={14} color={colors.gray} />
              <Text style={styles.inspeccionTime}>
                {new Date(inspeccion.fechaHoraInicio).toLocaleDateString()}
              </Text>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
          <Text style={styles.emptyText}>No hay inspecciones en progreso</Text>
          <Text style={styles.emptySubtext}>
            Inicia una nueva inspeccion para comenzar
          </Text>
        </Card>
      )}
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
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subGreeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
  },
  statNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inspeccionCard: {
    marginBottom: spacing.sm,
  },
  inspeccionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inspeccionSector: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  inspeccionChecklist: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inspeccionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inspeccionTime: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
