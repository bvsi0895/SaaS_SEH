import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { hallazgosApi } from '../../src/api/hallazgos';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import Card from '../../src/components/Card';
import { colors, spacing, fontSize, borderRadius } from '../../src/constants/theme';
import type { NivelRiesgo } from '../../src/types';

const nivelesRiesgo: { value: NivelRiesgo; label: string; color: string }[] = [
  { value: 'BAJO', label: 'Bajo', color: colors.success },
  { value: 'MEDIO', label: 'Medio', color: colors.warning },
  { value: 'ALTO', label: 'Alto', color: colors.error },
  { value: 'CRITICO', label: 'Critico', color: '#b71c1c' },
];

export default function NuevoHallazgoScreen() {
  const { inspeccionId } = useLocalSearchParams<{ inspeccionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubicacionTexto, setUbicacionTexto] = useState('');
  const [nivelRiesgo, setNivelRiesgo] = useState<NivelRiesgo>('MEDIO');
  const [foto, setFoto] = useState<string | null>(null);
  const [ubicacionGps, setUbicacionGps] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const createMutation = useMutation({
    mutationFn: hallazgosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccion', inspeccionId] });
      Alert.alert('Exito', 'Hallazgo registrado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo registrar el hallazgo'
      );
    },
  });

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setFoto(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setFoto(result.assets[0].uri);
    }
  };

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu ubicacion');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = `${location.coords.latitude},${location.coords.longitude}`;
      setUbicacionGps(coords);
      Alert.alert('Ubicacion obtenida', `Coordenadas: ${coords}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicacion');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!titulo.trim()) {
      Alert.alert('Error', 'Ingresa un titulo para el hallazgo');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Error', 'Ingresa una descripcion');
      return;
    }
    if (!ubicacionTexto.trim()) {
      Alert.alert('Error', 'Ingresa la ubicacion');
      return;
    }
    if (!inspeccionId) {
      Alert.alert('Error', 'ID de inspeccion no valido');
      return;
    }

    createMutation.mutate({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      ubicacionTexto: ubicacionTexto.trim(),
      nivelRiesgo,
      ubicacionGps: ubicacionGps || undefined,
      fotosUrls: foto || undefined,
      inspeccionId,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Titulo */}
      <Input
        label="Titulo del hallazgo"
        placeholder="Ej: Cable electrico expuesto"
        value={titulo}
        onChangeText={setTitulo}
      />

      {/* Descripcion */}
      <Input
        label="Descripcion"
        placeholder="Describe el hallazgo en detalle..."
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />

      {/* Ubicacion */}
      <Input
        label="Ubicacion"
        placeholder="Ej: Pasillo 3, Sector A"
        value={ubicacionTexto}
        onChangeText={setUbicacionTexto}
        leftIcon="location-outline"
      />

      {/* GPS */}
      <Button
        title={ubicacionGps ? 'Ubicacion GPS obtenida' : 'Obtener ubicacion GPS'}
        variant={ubicacionGps ? 'secondary' : 'outline'}
        onPress={handleGetLocation}
        loading={loadingLocation}
        icon={<Ionicons name="navigate" size={18} color={ubicacionGps ? colors.white : colors.primary} />}
        style={styles.gpsButton}
      />

      {/* Nivel de Riesgo */}
      <Text style={styles.label}>Nivel de Riesgo</Text>
      <View style={styles.riesgoContainer}>
        {nivelesRiesgo.map((nivel) => (
          <TouchableOpacity
            key={nivel.value}
            style={[
              styles.riesgoButton,
              {
                backgroundColor: nivelRiesgo === nivel.value ? nivel.color : colors.lightGray,
              },
            ]}
            onPress={() => setNivelRiesgo(nivel.value)}
          >
            <Text
              style={[
                styles.riesgoText,
                { color: nivelRiesgo === nivel.value ? colors.white : colors.text },
              ]}
            >
              {nivel.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Foto */}
      <Text style={styles.label}>Foto del hallazgo (opcional)</Text>
      {foto ? (
        <Card style={styles.fotoCard}>
          <Image source={{ uri: foto }} style={styles.fotoPreview} />
          <TouchableOpacity
            style={styles.fotoRemove}
            onPress={() => setFoto(null)}
          >
            <Ionicons name="close-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={styles.fotoButtons}>
          <Button
            title="Tomar foto"
            variant="outline"
            onPress={handleTakePhoto}
            icon={<Ionicons name="camera" size={18} color={colors.primary} />}
            style={styles.fotoButton}
          />
          <Button
            title="Galeria"
            variant="outline"
            onPress={handlePickImage}
            icon={<Ionicons name="images" size={18} color={colors.primary} />}
            style={styles.fotoButton}
          />
        </View>
      )}

      {/* Boton Guardar */}
      <Button
        title="Registrar Hallazgo"
        onPress={handleSubmit}
        loading={createMutation.isPending}
        style={styles.submitButton}
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  gpsButton: {
    marginTop: spacing.sm,
  },
  riesgoContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  riesgoButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  riesgoText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  fotoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
  },
  fotoRemove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
  },
  fotoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fotoButton: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});
