import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';

const rolLabels = {
  ADMIN_EMPRESA: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECNICO: 'Tecnico',
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesion',
      'Estas seguro de que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Avatar y nombre */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>
          {user.nombre} {user.apellido}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{rolLabels[user.rol]}</Text>
        </View>
      </View>

      {/* Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>
                {user.nombre} {user.apellido}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Correo electronico</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-outline" size={20} color={colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>{rolLabels[user.rol]}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Acciones */}
      <View style={styles.actions}>
        <Button
          title="Cerrar Sesion"
          onPress={handleLogout}
          variant="danger"
          icon={<Ionicons name="log-out-outline" size={20} color={colors.white} />}
        />
      </View>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rolBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  rolText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    paddingVertical: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: spacing.xs,
  },
  actions: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.gray,
  },
});
