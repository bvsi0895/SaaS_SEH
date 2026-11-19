import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  LinearProgress,
  Paper,
  Skeleton,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle as CumpleIcon,
  Cancel as NoCumpleIcon,
  RemoveCircle as NoAplicaIcon,
  Warning as ObservacionIcon,
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { inspeccionesApi } from '../../api/inspecciones';
import { hallazgosApi, CreateHallazgoDto, UpdateHallazgoDto } from '../../api/hallazgos';
import { accionesApi, CreateAccionDto, UpdateAccionDto } from '../../api/acciones';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { CumplimientoItem, NivelRiesgo } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { usuariosApi } from '../../api/usuarios';

const MAX_HALLAZGO_PHOTO_SIZE = 5 * 1024 * 1024;
const HALLAZGO_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const HALLAZGO_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getHallazgoPhotoValidationError(file: File): string | null {
  const extensionIsSupported = /\.(jpe?g|png|webp)$/i.test(file.name);
  const isHeic = file.type === 'image/heic'
    || file.type === 'image/heif'
    || /\.heic?$/i.test(file.name)
    || /\.heif$/i.test(file.name);

  if (isHeic) {
    return 'HEIC/HEIF no es compatible. Convertí la imagen a JPG, PNG o WEBP antes de seleccionarla.';
  }
  if (file.size > MAX_HALLAZGO_PHOTO_SIZE) {
    return 'La fotografía supera el límite de 5 MiB. Elegí un archivo más pequeño.';
  }
  if (!HALLAZGO_PHOTO_TYPES.has(file.type) || !extensionIsSupported) {
    return 'Formato no compatible. Solo se aceptan fotografías JPG, PNG o WEBP de hasta 5 MiB.';
  }
  return null;
}

function getBackendErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === 'string');
    return messages.length > 0 ? messages.join('. ') : fallback;
  }
  return typeof message === 'string' && message.trim().length > 0 && message.length <= 300
    ? message
    : fallback;
}

function getPhotoUploadErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: unknown } })?.response;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  const backendMessage = getBackendErrorMessage(error, '');
  const friendlyMessage = status === 413
    ? 'La carga fue rechazada por superar el límite permitido. Elegí una fotografía de hasta 5 MiB.'
    : status === 400
      ? 'El servidor rechazó la fotografía. Verificá que sea JPG, PNG o WEBP y menor a 5 MiB.'
      : status !== undefined && status >= 500
        ? 'El servidor no pudo procesar la fotografía. Podés reintentarlo sin crear otro hallazgo.'
        : status === undefined
          ? 'No se pudo conectar con el servidor. Verificá la conexión y reintentá sin crear otro hallazgo.'
          : 'No se pudo adjuntar la fotografía. Podés reintentarlo sin crear otro hallazgo.';
  const statusMessage = status === undefined ? '' : `HTTP ${status}. `;
  const safeBackendMessage = backendMessage
    .replace(/Bearer\s+\S+/gi, 'Bearer [oculto]')
    .replace(/(?:[A-Za-z]:\\|\/(?:app|var|tmp|home)\/)[^\s]+/g, '[ruta oculta]');
  const serverMessage = safeBackendMessage ? ` Mensaje del servidor: ${safeBackendMessage}` : '';
  return `${statusMessage}${friendlyMessage}${serverMessage}`;
}

type HallazgoRequiredField = 'titulo' | 'descripcion' | 'ubicacionTexto';

export function buildHallazgoUpdateData(
  draft: Partial<CreateHallazgoDto>,
): UpdateHallazgoDto {
  return {
    ...(draft.titulo !== undefined && { titulo: draft.titulo }),
    ...(draft.descripcion !== undefined && { descripcion: draft.descripcion }),
    ...(draft.nivelRiesgo !== undefined && { nivelRiesgo: draft.nivelRiesgo }),
    ...(draft.ubicacionTexto !== undefined && { ubicacionTexto: draft.ubicacionTexto }),
  };
}

export default function InspeccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { user, activeContextId } = useAuth();
  const isTechnician = user?.rol === 'TECNICO';

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItemStatus, setSelectedItemStatus] = useState<CumplimientoItem | null>(null);
  const [observacion, setObservacion] = useState('');
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [observacionesFinal, setObservacionesFinal] = useState('');
  const [reasignarDialogOpen, setReasignarDialogOpen] = useState(false);
  const [reasignarUsuarioId, setReasignarUsuarioId] = useState('');
  const [hallazgoDialogOpen, setHallazgoDialogOpen] = useState(false);
  const [editingHallazgoId, setEditingHallazgoId] = useState<string | null>(null);
  const [editingAccionId, setEditingAccionId] = useState<string | null>(null);
  const [hallazgoOriginItemId, setHallazgoOriginItemId] = useState<string | null>(null);
  const [hallazgoPhoto, setHallazgoPhoto] = useState<File | null>(null);
  const [hallazgoPhotoError, setHallazgoPhotoError] = useState<string | null>(null);
  const [hallazgoPhotoUploadError, setHallazgoPhotoUploadError] = useState<string | null>(null);
  const [hallazgoSaveError, setHallazgoSaveError] = useState<string | null>(null);
  const [hallazgoFieldErrors, setHallazgoFieldErrors] = useState<Partial<Record<HallazgoRequiredField, string>>>({});
  const [accionDescripcion, setAccionDescripcion] = useState('');
  const [accionFechaCompromiso, setAccionFechaCompromiso] = useState(new Date().toISOString().slice(0, 10));
  const [accionResponsableId, setAccionResponsableId] = useState('');
  const [accionError, setAccionError] = useState<string | null>(null);
  const [nuevoHallazgo, setNuevoHallazgo] = useState<Partial<CreateHallazgoDto>>({
    nivelRiesgo: 'MEDIO',
  });

  const iniciarMutation = useMutation({
    mutationFn: () => inspeccionesApi.iniciar(id!),
    onSuccess: (inspection) => {
      showSuccess('Inspección iniciada');
      queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      queryClient.invalidateQueries({ queryKey: ['inspeccion', inspection.id] });
    },
    onError: () => showError('No se pudo iniciar la inspección'),
  });

  const reasignarMutation = useMutation({
    mutationFn: () => inspeccionesApi.reasignar(id!, reasignarUsuarioId),
    onSuccess: () => {
      showSuccess('Inspección reasignada');
      queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      setReasignarDialogOpen(false);
      setReasignarUsuarioId('');
    },
    onError: () => showError('No se pudo reasignar la inspección'),
  });

  const { data: inspeccion, isLoading } = useQuery({
    queryKey: ['inspeccion', id, activeContextId, user?.id, user?.rol],
    queryFn: () => inspeccionesApi.getById(id!),
    enabled: !!id,
  });

  const { data: tecnicos = [], isLoading: tecnicosLoading } = useQuery({
    queryKey: ['usuarios', 'tecnicos', activeContextId, user?.id, user?.rol],
    queryFn: usuariosApi.getTecnicos,
    enabled: !isTechnician,
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
      setSelectedItem(null);
      setSelectedItemStatus(null);
      setObservacion('');
    },
    onError: () => {
      showError('Error al registrar el item');
    },
  });

  const finalizarMutation = useMutation({
    mutationFn: () => inspeccionesApi.finalizar(id!, { observaciones: observacionesFinal }),
    onSuccess: () => {
      showSuccess('Inspeccion finalizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
      setFinalizarDialogOpen(false);
    },
    onError: () => {
      showError('Error al finalizar la inspeccion');
    },
  });

  const crearHallazgoMutation = useMutation({
    mutationFn: (data: CreateHallazgoDto) => hallazgosApi.create(data),
    onSuccess: (hallazgo) => {
      setEditingHallazgoId(hallazgo.id);
      queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      if (hallazgoPhoto) {
        subirFotoMutation.mutate({
          id: hallazgo.id,
          file: hallazgoPhoto,
          successMessage: 'Hallazgo y fotografía creados exitosamente',
        });
        return;
      }
      guardarAccionCorrectiva(hallazgo.id, 'Hallazgo creado exitosamente');
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'No se pudo crear el hallazgo');
      setHallazgoSaveError(message);
      showError(`No se pudo crear el hallazgo: ${message}`);
    },
  });

  const actualizarHallazgoMutation = useMutation({
    mutationFn: ({ id: hallazgoId, data }: { id: string; data: UpdateHallazgoDto }) =>
      hallazgosApi.update(hallazgoId, data),
    onSuccess: (hallazgo) => {
      queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgo', hallazgo.id] });
      if (hallazgoPhoto) {
        subirFotoMutation.mutate({
          id: hallazgo.id,
          file: hallazgoPhoto,
          successMessage: 'Hallazgo y fotografía actualizados exitosamente',
        });
        return;
      }
      guardarAccionCorrectiva(hallazgo.id, 'Hallazgo actualizado exitosamente');
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'No se pudo actualizar el hallazgo');
      setHallazgoSaveError(message);
      showError(`No se pudo actualizar el hallazgo: ${message}`);
    },
  });

  const subirFotoMutation = useMutation({
    mutationFn: ({ id: hallazgoId, file }: { id: string; file: File; successMessage: string }) =>
      hallazgosApi.uploadPhoto(hallazgoId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgo', variables.id] });
      setHallazgoPhoto(null);
      guardarAccionCorrectiva(variables.id, variables.successMessage);
      setHallazgoPhotoUploadError(null);
    },
    onError: (error) => {
      const message = getPhotoUploadErrorMessage(error);
      setHallazgoPhotoUploadError(message);
      showError(`Hallazgo guardado, pero la fotografía no se pudo adjuntar. ${message}`);
    },
  });

  const crearAccionMutation = useMutation({
    mutationFn: (data: CreateAccionDto) => accionesApi.create(data),
    onSuccess: (_accion, variables) => {
      showSuccess('Hallazgo y acción correctiva guardados exitosamente');
      queryClient.invalidateQueries({ queryKey: ['acciones'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgo', variables.hallazgoId] });
      finalizarCreacionHallazgo();
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'No se pudo crear la acción correctiva');
      const fullMessage = `El hallazgo ya fue guardado, pero no se pudo crear la acción correctiva: ${message}`;
      setAccionError(fullMessage);
      showError(fullMessage);
    },
  });

  const actualizarAccionMutation = useMutation({
    mutationFn: ({ id: accionId, data }: { id: string; data: UpdateAccionDto; hallazgoId: string }) =>
      accionesApi.update(accionId, data),
    onSuccess: (_accion, variables) => {
      showSuccess('Hallazgo y acción correctiva actualizados exitosamente');
      queryClient.invalidateQueries({ queryKey: ['acciones'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
      queryClient.invalidateQueries({ queryKey: ['hallazgo', variables.hallazgoId] });
      finalizarCreacionHallazgo();
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'No se pudo actualizar la acción correctiva');
      const fullMessage = `El hallazgo ya fue guardado, pero no se pudo actualizar la acción correctiva: ${message}`;
      setAccionError(fullMessage);
      showError(fullMessage);
    },
  });

  const guardarAccionCorrectiva = (hallazgoId: string, successMessage: string) => {
    if (isTechnician) {
      showSuccess(successMessage);
      finalizarCreacionHallazgo();
      return;
    }
    if (accionDescripcion.trim() && accionFechaCompromiso) {
      const data = {
        descripcion: accionDescripcion.trim(),
        fechaCompromiso: accionFechaCompromiso,
        ...(accionResponsableId ? { responsableId: accionResponsableId } : {}),
      };
      if (editingAccionId) {
        actualizarAccionMutation.mutate({ id: editingAccionId, data, hallazgoId });
      } else {
        crearAccionMutation.mutate({ ...data, hallazgoId });
      }
      return;
    }
    showSuccess(successMessage);
    finalizarCreacionHallazgo();
  };

  const finalizarCreacionHallazgo = () => {
    queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
    queryClient.invalidateQueries({ queryKey: ['hallazgos'] });
    setHallazgoDialogOpen(false);
    setHallazgoPhoto(null);
    setHallazgoPhotoError(null);
    setHallazgoPhotoUploadError(null);
    setHallazgoSaveError(null);
    setHallazgoFieldErrors({});
    setAccionDescripcion('');
    setAccionFechaCompromiso(new Date().toISOString().slice(0, 10));
    setAccionResponsableId('');
    setAccionError(null);
    setEditingHallazgoId(null);
    setEditingAccionId(null);
    setHallazgoOriginItemId(null);
    setNuevoHallazgo({ nivelRiesgo: 'MEDIO' });
  };

  const openHallazgoForItem = (itemId: string) => {
    const item = inspeccion?.items?.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const existing = inspeccion?.hallazgos?.find((hallazgo) => hallazgo.inspeccionItemId === itemId);
    setEditingHallazgoId(existing?.id || null);
    setHallazgoOriginItemId(itemId);
    const existingAction = existing?.accionesCorrectivas?.[0];
    setEditingAccionId(existingAction?.id || null);
    setAccionDescripcion(existingAction?.descripcion || '');
    setAccionFechaCompromiso(existingAction?.fechaCompromiso?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setAccionResponsableId(existingAction?.responsableId || '');
    setAccionError(null);
    setHallazgoPhotoError(null);
    setHallazgoPhotoUploadError(null);
    setHallazgoSaveError(null);
    setHallazgoFieldErrors({});
    setNuevoHallazgo(existing
      ? {
          titulo: existing.titulo,
          descripcion: existing.descripcion,
          nivelRiesgo: existing.nivelRiesgo,
          ubicacionTexto: existing.ubicacionTexto,
          inspeccionId: id!,
          inspeccionItemId: itemId,
        }
      : {
          titulo: `Incumplimiento: ${item.checklistItem?.descripcion || 'Ítem de inspección'}`,
          nivelRiesgo: 'MEDIO',
          ubicacionTexto: inspeccion?.sector || '',
          inspeccionId: id!,
          inspeccionItemId: itemId,
        });
    setHallazgoDialogOpen(true);
  };

  const handleNoCumple = (itemId: string) => {
    registrarItemMutation.mutate(
      { itemId, cumplimiento: 'NO_CUMPLE' },
      { onSuccess: () => openHallazgoForItem(itemId) },
    );
  };

  const cancelarHallazgo = () => {
    const hadLinkedNonCompliance = !!hallazgoOriginItemId;
    setHallazgoDialogOpen(false);
    setHallazgoPhoto(null);
    setHallazgoPhotoError(null);
    setHallazgoPhotoUploadError(null);
    setHallazgoSaveError(null);
    setHallazgoFieldErrors({});
    setAccionDescripcion('');
    setAccionFechaCompromiso(new Date().toISOString().slice(0, 10));
    setAccionResponsableId('');
    setAccionError(null);
    setEditingHallazgoId(null);
    setEditingAccionId(null);
    setHallazgoOriginItemId(null);
    if (hadLinkedNonCompliance) {
      showSuccess('El incumplimiento quedó guardado sin hallazgo. Puede registrarlo nuevamente desde el ítem.');
    }
  };

  const handleHallazgoPhotoSelection = (files: FileList | null) => {
    setHallazgoPhotoError(null);
    setHallazgoPhotoUploadError(null);
    if (!files || files.length === 0) {
      setHallazgoPhotoError('No se seleccionó ninguna fotografía. Podés intentarlo nuevamente.');
      return;
    }

    const [file] = Array.from(files);
    const validationError = getHallazgoPhotoValidationError(file);
    if (validationError) {
      setHallazgoPhotoError(validationError);
      return;
    }

    setHallazgoPhoto(file);
  };

  const handleRetryHallazgoPhoto = () => {
    if (!editingHallazgoId || !hallazgoPhoto || subirFotoMutation.isPending) return;
    setHallazgoPhotoUploadError(null);
    subirFotoMutation.mutate({
      id: editingHallazgoId,
      file: hallazgoPhoto,
      successMessage: 'Hallazgo y fotografía guardados exitosamente',
    });
  };

  const handleCumplimiento = (itemId: string, cumplimiento: CumplimientoItem) => {
    if (cumplimiento === 'NO_CUMPLE') {
      handleNoCumple(itemId);
    } else if (cumplimiento === 'OBSERVACION') {
      setSelectedItem(itemId);
      setSelectedItemStatus(cumplimiento);
      setObservacion(inspeccion?.items?.find((item) => item.id === itemId)?.observacion || '');
    } else {
      registrarItemMutation.mutate({ itemId, cumplimiento });
    }
  };

  const handleSaveObservacion = () => {
    if (selectedItem) {
      const item = inspeccion?.items?.find((i) => i.id === selectedItem);
      if (item) {
        registrarItemMutation.mutate({
          itemId: selectedItem,
          cumplimiento: selectedItemStatus || 'OBSERVACION',
          observacion,
        });
      }
    }
  };

  const clearHallazgoFieldError = (field: HallazgoRequiredField) => {
    setHallazgoFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateHallazgoFields = () => {
    const errors: Partial<Record<HallazgoRequiredField, string>> = {};
    if (!nuevoHallazgo.titulo?.trim()) errors.titulo = 'El título es obligatorio.';
    if (!nuevoHallazgo.descripcion?.trim()) errors.descripcion = 'La descripción es obligatoria.';
    if (!nuevoHallazgo.ubicacionTexto?.trim()) errors.ubicacionTexto = 'La ubicación es obligatoria.';
    setHallazgoFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCrearHallazgo = () => {
    setAccionError(null);
    setHallazgoSaveError(null);
    if (!validateHallazgoFields()) return;

    if (!isTechnician && accionDescripcion.trim()) {
      if (accionDescripcion.trim().length < 10) {
        setAccionError('La descripción de la acción correctiva debe tener al menos 10 caracteres.');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(accionFechaCompromiso) || Number.isNaN(Date.parse(`${accionFechaCompromiso}T00:00:00`))) {
        setAccionError('La fecha de compromiso no es válida.');
        return;
      }
      if (accionResponsableId && !tecnicos.some((tecnico) => tecnico.id === accionResponsableId && tecnico.activo)) {
        setAccionError('El responsable seleccionado no está autorizado para esta empresa y organización.');
        return;
      }
    }

    const data = buildHallazgoUpdateData(nuevoHallazgo);
    if (editingHallazgoId) {
      actualizarHallazgoMutation.mutate({ id: editingHallazgoId, data });
    } else {
      crearHallazgoMutation.mutate({
        titulo: nuevoHallazgo.titulo!.trim(),
        descripcion: nuevoHallazgo.descripcion!.trim(),
        nivelRiesgo: nuevoHallazgo.nivelRiesgo!,
        ubicacionTexto: nuevoHallazgo.ubicacionTexto!.trim(),
        inspeccionId: id!,
        ...(hallazgoOriginItemId || nuevoHallazgo.inspeccionItemId
          ? { inspeccionItemId: hallazgoOriginItemId || nuevoHallazgo.inspeccionItemId }
          : {}),
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await inspeccionesApi.getPDF(id!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspeccion-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Error al descargar el PDF');
    }
  };

  const getCumplimientoIcon = (cumplimiento: CumplimientoItem) => {
    switch (cumplimiento) {
      case 'CUMPLE':
        return <CumpleIcon color="success" />;
      case 'NO_CUMPLE':
        return <NoCumpleIcon color="error" />;
      case 'NO_APLICA':
        return <NoAplicaIcon color="disabled" />;
      case 'OBSERVACION':
        return <ObservacionIcon color="warning" />;
      default:
        return null;
    }
  };

  const itemsCompletados = inspeccion?.items?.filter((i) => i.cumplimiento !== 'PENDIENTE').length || 0;
  const totalItems = inspeccion?.items?.length || 0;
  const progreso = totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;
  const itemsNoAplica = inspeccion?.items?.filter((i) => i.cumplimiento === 'NO_APLICA').length || 0;
  const itemsCumplen = inspeccion?.items?.filter((i) => i.cumplimiento === 'CUMPLE').length || 0;
  const itemsEvaluables = totalItems - itemsNoAplica;
  const porcentajeCumplimiento = itemsEvaluables > 0
    ? Math.round((itemsCumplen / itemsEvaluables) * 100)
    : 0;

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!inspeccion) {
    return <Typography>Inspeccion no encontrada</Typography>;
  }

  const isEditable = inspeccion.estado === 'EN_PROGRESO';
  const isPending = inspeccion.estado === 'PENDIENTE';
  const canStart = isPending && inspeccion.asignadoAId === user?.id;
  const assigned = inspeccion.asignadoA || inspeccion.usuario;
  const creator = inspeccion.creadoPor;

  return (
    <Box>
      <PageHeader
        title={`Inspeccion: ${inspeccion.sector}`}
        breadcrumbs={[
          { label: 'Inspecciones', path: '/inspecciones' },
          { label: inspeccion.sector },
        ]}
        action={{
          label: 'Volver',
          onClick: () => navigate('/inspecciones'),
          icon: 'back',
        }}
      />

      <Grid container spacing={3}>
        {/* Info General */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informacion General
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={inspeccion.estado} type="estado" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Checklist
                  </Typography>
                  <Typography variant="body2">{inspeccion.checklist?.nombre}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Creada por
                  </Typography>
                  <Typography variant="body2">
                    {creator?.nombre || '-'} {creator?.apellido || ''}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Asignada a
                  </Typography>
                  <Typography variant="body2">
                    {assigned?.nombre || '-'} {assigned?.apellido || ''}
                  </Typography>
                </Box>

                {inspeccion.fechaProgramada && <Box>
                  <Typography variant="caption" color="text.secondary">Fecha programada</Typography>
                  <Typography variant="body2">{format(new Date(inspeccion.fechaProgramada), "dd/MM/yyyy", { locale: es })}</Typography>
                </Box>}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de creación
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(inspeccion.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Inicio real
                  </Typography>
                  <Typography variant="body2">
                    {inspeccion.fechaHoraInicio
                      ? format(new Date(inspeccion.fechaHoraInicio), "dd/MM/yyyy HH:mm", { locale: es })
                      : 'No iniciada'}
                  </Typography>
                </Box>

                {inspeccion.fechaHoraFin && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha Fin
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(inspeccion.fechaHoraFin), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Progreso de respuestas
                  </Typography>
                  <LinearProgress variant="determinate" value={progreso} sx={{ mt: 0.5, mb: 0.5 }} />
                  <Typography variant="body2">
                    {itemsCompletados} / {totalItems} respondidos ({progreso}%)
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nivel de cumplimiento
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={porcentajeCumplimiento}
                    color="success"
                    sx={{ mt: 0.5, mb: 0.5 }}
                  />
                  <Typography variant="body2">
                    {itemsCumplen} / {itemsEvaluables} cumplen ({porcentajeCumplimiento}%)
                  </Typography>
                </Box>
              </Box>

              {inspeccion.estado === 'COMPLETADA' && (
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleDownloadPDF}
                >
                  Descargar PDF
                </Button>
              )}

              {canStart && <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => iniciarMutation.mutate()}
                disabled={iniciarMutation.isPending}
              >
                {iniciarMutation.isPending ? 'Iniciando...' : 'Iniciar inspección'}
              </Button>}

              {!isTechnician && isPending && <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => setReasignarDialogOpen(true)}
              >
                Reasignar inspección
              </Button>}

              {isEditable && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => {
                      setEditingHallazgoId(null);
                      setEditingAccionId(null);
                      setHallazgoOriginItemId(null);
                      setAccionDescripcion('');
                      setAccionFechaCompromiso(new Date().toISOString().slice(0, 10));
                      setNuevoHallazgo({ nivelRiesgo: 'MEDIO', inspeccionId: id! });
                      setHallazgoDialogOpen(true);
                    }}
                  >
                    Registrar Hallazgo
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1 }}
                    onClick={() => setFinalizarDialogOpen(true)}
                    disabled={progreso < 100}
                  >
                    Finalizar Inspeccion
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Hallazgos */}
          {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hallazgos ({inspeccion.hallazgos.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {inspeccion.hallazgos.map((hallazgo) => (
                    <ListItem
                      key={hallazgo.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/hallazgos/${hallazgo.id}`)}
                    >
                      <ListItemText
                        primary={hallazgo.titulo}
                        secondary={hallazgo.ubicacionTexto}
                      />
                      <ListItemSecondaryAction>
                        <StatusChip status={hallazgo.nivelRiesgo} type="riesgo" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Items del Checklist */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Items del Checklist
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <List>
                {inspeccion.items?.map((item, index) => (
                  <Paper key={item.id} sx={{ mb: 1, p: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1">
                          {index + 1}. {item.checklistItem?.descripcion}
                        </Typography>
                        {item.observacion && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Obs: {item.observacion}
                          </Typography>
                        )}
                      </Box>

                      {isEditable ? (
                        <ToggleButtonGroup
                          value={item.cumplimiento}
                          exclusive
                          size="small"
                          onChange={(_, value) => {
                            if (value) handleCumplimiento(item.id, value);
                          }}
                        >
                          <ToggleButton value="CUMPLE" color="success" aria-label="Cumple">
                            <Tooltip title="Cumple">
                              <span>
                              <CumpleIcon />
                              </span>
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="NO_CUMPLE" color="error" aria-label="No cumple">
                            <Tooltip title="No cumple">
                              <span>
                              <NoCumpleIcon />
                              </span>
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="OBSERVACION" color="warning" aria-label="Con observaciones">
                            <Tooltip title="Con observaciones">
                              <span>
                              <ObservacionIcon />
                              </span>
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="NO_APLICA" aria-label="No aplica">
                            <Tooltip title="No aplica">
                              <span>
                              <NoAplicaIcon />
                              </span>
                            </Tooltip>
                          </ToggleButton>
                        </ToggleButtonGroup>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getCumplimientoIcon(item.cumplimiento)}
                          <StatusChip status={item.cumplimiento} type="cumplimiento" />
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para observacion */}
      <Dialog
        open={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setSelectedItemStatus(null);
          setObservacion('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agregar Observacion</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Observacion"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedItem(null);
              setSelectedItemStatus(null);
              setObservacion('');
            }}
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveObservacion}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para finalizar */}
      <Dialog open={reasignarDialogOpen} onClose={() => setReasignarDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reasignar inspección</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Nuevo técnico responsable"
            value={reasignarUsuarioId}
            onChange={(event) => setReasignarUsuarioId(event.target.value)}
            sx={{ mt: 1 }}
          >
            {tecnicos.filter((tecnico) => tecnico.activo && tecnico.id !== inspeccion.asignadoAId).map((tecnico) => (
              <MenuItem key={tecnico.id} value={tecnico.id}>{tecnico.nombre} {tecnico.apellido}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasignarDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!reasignarUsuarioId || reasignarMutation.isPending} onClick={() => reasignarMutation.mutate()}>
            {reasignarMutation.isPending ? 'Reasignando...' : 'Reasignar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para finalizar */}
      <Dialog
        open={finalizarDialogOpen}
        onClose={() => setFinalizarDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Finalizar Inspeccion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta por finalizar la inspeccion. Agregue observaciones finales si lo desea.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Observaciones finales"
            value={observacionesFinal}
            onChange={(e) => setObservacionesFinal(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizarDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => finalizarMutation.mutate()}
            disabled={finalizarMutation.isPending}
          >
            {finalizarMutation.isPending ? 'Finalizando...' : 'Finalizar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para nuevo hallazgo */}
      <Dialog
        open={hallazgoDialogOpen}
        onClose={cancelarHallazgo}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingHallazgoId ? 'Editar Hallazgo' : 'Registrar Hallazgo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {hallazgoSaveError && (
              <Grid item xs={12}>
                <Alert severity="error" role="alert">
                  {hallazgoSaveError}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titulo"
                value={nuevoHallazgo.titulo || ''}
                onChange={(e) => {
                  setNuevoHallazgo({ ...nuevoHallazgo, titulo: e.target.value });
                  clearHallazgoFieldError('titulo');
                }}
                error={Boolean(hallazgoFieldErrors.titulo)}
                helperText={hallazgoFieldErrors.titulo}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripcion"
                value={nuevoHallazgo.descripcion || ''}
                onChange={(e) => {
                  setNuevoHallazgo({ ...nuevoHallazgo, descripcion: e.target.value });
                  clearHallazgoFieldError('descripcion');
                }}
                error={Boolean(hallazgoFieldErrors.descripcion)}
                helperText={hallazgoFieldErrors.descripcion}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Nivel de Riesgo"
                value={nuevoHallazgo.nivelRiesgo || 'MEDIO'}
                onChange={(e) =>
                  setNuevoHallazgo({
                    ...nuevoHallazgo,
                    nivelRiesgo: e.target.value as NivelRiesgo,
                  })
                }
              >
                <MenuItem value="BAJO">Bajo</MenuItem>
                <MenuItem value="MEDIO">Medio</MenuItem>
                <MenuItem value="ALTO">Alto</MenuItem>
                <MenuItem value="CRITICO">Critico</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ubicacion"
                value={nuevoHallazgo.ubicacionTexto || ''}
                onChange={(e) => {
                  setNuevoHallazgo({ ...nuevoHallazgo, ubicacionTexto: e.target.value });
                  clearHallazgoFieldError('ubicacionTexto');
                }}
                error={Boolean(hallazgoFieldErrors.ubicacionTexto)}
                helperText={hallazgoFieldErrors.ubicacionTexto}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button component="label" variant="outlined">
                  Tomar fotografía
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onClick={(event) => { event.currentTarget.value = ''; }}
                    onChange={(event) => handleHallazgoPhotoSelection(event.target.files)}
                  />
                </Button>
                <Button component="label" variant="outlined">
                  Elegir de galería
                  <input
                    hidden
                    type="file"
                    accept={HALLAZGO_PHOTO_ACCEPT}
                    onClick={(event) => { event.currentTarget.value = ''; }}
                    onChange={(event) => handleHallazgoPhotoSelection(event.target.files)}
                  />
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                JPG, PNG o WEBP hasta 5 MiB. HEIC/HEIF no es compatible.
              </Typography>
              {hallazgoPhoto && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Fotografía seleccionada: {hallazgoPhoto.name}
                </Typography>
              )}
              {hallazgoPhotoError && (
                <Alert severity="warning" sx={{ mt: 1 }} role="alert">
                  {hallazgoPhotoError}
                </Alert>
              )}
              {hallazgoPhotoUploadError && (
                <Alert
                  severity="error"
                  sx={{ mt: 1 }}
                  role="alert"
                  action={(
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleRetryHallazgoPhoto}
                      disabled={!editingHallazgoId || !hallazgoPhoto || subirFotoMutation.isPending}
                    >
                      Reintentar fotografía
                    </Button>
                  )}
                >
                  {hallazgoPhotoUploadError}
                </Alert>
              )}
            </Grid>
            {!isTechnician && <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Acción correctiva (opcional)"
                value={accionDescripcion}
                onChange={(e) => {
                  setAccionDescripcion(e.target.value);
                  setAccionError(null);
                }}
                helperText="Si la completa, se creará una acción pendiente vinculada al hallazgo."
                error={Boolean(accionError)}
              />
            </Grid>}
            {!isTechnician && <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Responsable (opcional)"
                value={accionResponsableId}
                onChange={(e) => {
                  setAccionResponsableId(e.target.value);
                  setAccionError(null);
                }}
                disabled={tecnicosLoading}
                helperText={tecnicosLoading
                  ? 'Cargando técnicos autorizados...'
                  : 'Solo técnicos activos de la empresa y organización actuales'}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {tecnicos.filter((tecnico) => tecnico.activo).map((tecnico) => (
                  <MenuItem key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre} {tecnico.apellido}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>}
            {!isTechnician && <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha compromiso"
                value={accionFechaCompromiso}
                onChange={(e) => {
                  setAccionFechaCompromiso(e.target.value);
                  setAccionError(null);
                }}
                InputLabelProps={{ shrink: true }}
                disabled={!accionDescripcion.trim()}
              />
            </Grid>}
            {!isTechnician && accionError && <Grid item xs={12}>
              <Alert severity="error">{accionError}</Alert>
            </Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelarHallazgo}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrearHallazgo}
            disabled={crearHallazgoMutation.isPending || actualizarHallazgoMutation.isPending || subirFotoMutation.isPending || crearAccionMutation.isPending || actualizarAccionMutation.isPending}
          >
            {crearHallazgoMutation.isPending || actualizarHallazgoMutation.isPending || subirFotoMutation.isPending || crearAccionMutation.isPending || actualizarAccionMutation.isPending
              ? 'Guardando...'
              : editingHallazgoId ? 'Guardar Hallazgo' : 'Crear Hallazgo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

