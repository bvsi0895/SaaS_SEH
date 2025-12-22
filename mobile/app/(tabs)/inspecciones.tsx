import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { inspeccionesApi } from '../../src/api/inspecciones';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import StatusBadge from '../../src/components/StatusBadge';
import Loading from '../../src/components/Loading';
import { colors, spacing, fontSize } from '../../src/constants/theme';
import type { Inspeccion } from '../../src/types';

export default function InspeccionesScreen() {
  const router = useRouter();

  const {
    data: inspecciones,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['inspecciones', 'mis'],
    queryFn: inspeccionesApi.getMisInspecciones,
  });

  const renderItem = ({ item }: { item: Inspeccion }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/inspeccion/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.sector}</Text>
          <StatusBadge status={item.estado} size="small" />
        </View>
      </View>

      <Text style={styles.cardChecklist}>{item.checklist?.nombre}</Text>

      <View style={styles.cardInfo}>
        <View style={styles.cardInfoItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.gray} />
          <Text style={styles.cardInfoText}>
            {new Date(item.fechaHoraInicio).toLocaleDateString()}
          </Text>
        </View>
        {item._count?.hallazgos !== undefined && item._count.hallazgos > 0 && (
          <View style={styles.cardInfoItem}>
            <Ionicons name="warning-outline" size={14} color={colors.warning} />
            <Text style={styles.cardInfoText}>
              {item._count.hallazgos} hallazgo(s)
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="clipboard-outline" size={64} color={colors.lightGray} />
      <Text style={styles.emptyTitle}>Sin inspecciones</Text>
      <Text style={styles.emptyText}>
        No tienes inspecciones registradas
      </Text>
      <Button
        title="Nueva Inspeccion"
        onPress={() => router.push('/inspeccion/nueva')}
        style={styles.emptyButton}
      />
    </View>
  );

  if (isLoading) {
    return <Loading fullScreen message="Cargando inspecciones..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={inspecciones}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          <Button
            title="Nueva Inspeccion"
            onPress={() => router.push('/inspeccion/nueva')}
            icon={<Ionicons name="add" size={20} color={colors.white} />}
            style={styles.newButton}
          />
        }
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
  },
  newButton: {
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    marginBottom: spacing.xs,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardChecklist: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardInfo: {
    flexDirection: 'row',
    gap: spacing.md,
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
  emptyButton: {
    marginTop: spacing.lg,
  },
});
