import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { accionesApi } from '../../src/api/acciones';
import Card from '../../src/components/Card';
import StatusBadge from '../../src/components/StatusBadge';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize } from '../../src/constants/theme';
import type { AccionCorrectiva } from '../../src/types';

export default function AccionesScreen() {
  const router = useRouter();

  const {
    data: acciones,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['acciones', 'mis'],
    queryFn: accionesApi.getMisAcciones,
  });

  const isVencida = (accion: AccionCorrectiva) => {
    const fechaCompromiso = new Date(accion.fechaCompromiso);
    const hoy = new Date();
    return (
      fechaCompromiso < hoy &&
      (accion.estado === 'PENDIENTE' || accion.estado === 'EN_PROGRESO')
    );
  };

  const renderItem = ({ item }: { item: AccionCorrectiva }) => (
    <Card
      style={[styles.card, isVencida(item) ? styles.cardVencida : undefined]}
      onPress={() => router.push(`/accion/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.descripcion}
        </Text>
        <StatusBadge status={item.estado} size="small" />
      </View>

      {item.hallazgo && (
        <View style={styles.hallazgoInfo}>
          <Ionicons name="warning" size={14} color={colors.warning} />
          <Text style={styles.hallazgoText} numberOfLines={1}>
            {item.hallazgo.titulo}
          </Text>
          <StatusBadge
            status={item.hallazgo.nivelRiesgo}
            type="riesgo"
            size="small"
          />
        </View>
      )}

      <View style={styles.cardInfo}>
        <View style={styles.cardInfoItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.gray} />
          <Text
            style={[
              styles.cardInfoText,
              isVencida(item) && styles.textVencida,
            ]}
          >
            Compromiso: {new Date(item.fechaCompromiso).toLocaleDateString()}
          </Text>
        </View>
        {isVencida(item) && (
          <View style={styles.vencidaBadge}>
            <Ionicons name="alert-circle" size={12} color={colors.white} />
            <Text style={styles.vencidaText}>Vencida</Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
      <Text style={styles.emptyTitle}>Sin acciones pendientes</Text>
      <Text style={styles.emptyText}>
        No tienes acciones correctivas asignadas
      </Text>
    </View>
  );

  if (isLoading) {
    return <Loading fullScreen message="Cargando acciones..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={acciones}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardVencida: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  hallazgoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  hallazgoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardInfoText: {
    fontSize: fontSize.xs,
    color: colors.gray,
  },
  textVencida: {
    color: colors.error,
    fontWeight: '600',
  },
  vencidaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  vencidaText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
