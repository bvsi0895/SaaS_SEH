import { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
  Alert,
  CircularProgress,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, PhotoLibrary as PhotoLibraryIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hallazgosApi } from '../../api/hallazgos';
import { accionesApi, CreateAccionDto } from '../../api/acciones';
import { getQueryScope, invalidateActionQueries, invalidateFindingQueries, queryKeys } from '../../queryKeys';
import { usuariosApi } from '../../api/usuarios';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getPhotoPaths = (fotosUrls?: string) => {
  if (!fotosUrls) return [];
  try {
    const parsed = JSON.parse(fotosUrls);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

const getPhotoFilename = (path: string) => {
  const filename = path.split('/').pop() || path;
  return decodeURIComponent(filename);
};

export default function HallazgoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const { user, activeContextId } = useAuth();
  const isTechnician = user?.rol === 'TECNICO';
  const queryScope = getQueryScope(activeContextId, user?.id, user?.rol);

  const [accionDialogOpen, setAccionDialogOpen] = useState(false);
  const [nuevaAccion, setNuevaAccion] = useState<Partial<CreateAccionDto>>({
    fechaCompromiso: new Date().toISOString(),
  });
  const [photoPreviews, setPhotoPreviews] = useState<Array<{ filename: string; url: string }>>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<{ filename: string; url: string } | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const { data: hallazgo, isLoading } = useQuery({
    queryKey: queryKeys.finding(id || '', queryScope),
    queryFn: () => hallazgosApi.getById(id!),
    enabled: !!id,
  });

  const { data: tecnicos } = useQuery({
    queryKey: ['usuarios', 'tecnicos', activeContextId, user?.id, user?.rol],
    queryFn: usuariosApi.getTecnicos,
  });

  useEffect(() => {
    let cancelled = false;
    const createdPreviews: Array<{ filename: string; url: string }> = [];
    const urls = getPhotoPaths(hallazgo?.fotosUrls);
    setPhotoPreviews([]);
    setSelectedPhoto(null);
    setPhotoError(null);
    if (!id || urls.length === 0) {
      setPhotoLoading(false);
      return () => undefined;
    }

    setPhotoLoading(true);
    Promise.all(urls.map(async (path) => {
      const filename = getPhotoFilename(path);
      const blob = await hallazgosApi.getPhoto(id, filename);
      const preview = { filename, url: URL.createObjectURL(blob) };
      createdPreviews.push(preview);
      return preview;
    }))
      .then((previews) => {
        if (cancelled) {
          previews.forEach((preview) => URL.revokeObjectURL(preview.url));
          return;
        }
        setPhotoPreviews(previews);
      })
      .catch(() => {
        createdPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
        if (!cancelled) setPhotoError('No se pudieron cargar las evidencias fotográficas');
      })
      .finally(() => {
        if (!cancelled) setPhotoLoading(false);
      });

    return () => {
      cancelled = true;
      createdPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [id, hallazgo?.fotosUrls]);

  const handlePhotoSelection = (files: FileList | null) => {
    setUploadError(null);
    setUploadSuccess(null);
    const validFiles = Array.from(files || []).filter((file) => {
      if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_SIZE) {
        setUploadError('Solo se aceptan JPG, PNG o WebP de hasta 5 MiB por archivo');
        return false;
      }
      return true;
    });
    setSelectedFiles(validFiles);
    setUploadProgress({});
  };

  const handleUploadPhotos = async () => {
    if (!id || selectedFiles.length === 0) return;
    setUploadingPhotos(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      for (const file of selectedFiles) {
        setUploadProgress((current) => ({ ...current, [file.name]: 0 }));
        await hallazgosApi.uploadPhoto(id, file, (progress) => {
          setUploadProgress((current) => ({ ...current, [file.name]: progress }));
        });
      }
      await invalidateFindingQueries(queryClient, queryScope, id);
      setSelectedFiles([]);
      setUploadProgress({});
      setUploadSuccess(`${selectedFiles.length} fotografía(s) cargada(s) correctamente`);
    } catch {
      setUploadError('No se pudieron cargar todas las fotografías. Las ya confirmadas se conservaron.');
      await invalidateFindingQueries(queryClient, queryScope, id);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const crearAccionMutation = useMutation({
    mutationFn: (data: CreateAccionDto) => accionesApi.create(data),
    onSuccess: async (accion) => {
      showSuccess('Accion correctiva creada exitosamente');
      await invalidateActionQueries(queryClient, queryScope, accion.id, id);
      setAccionDialogOpen(false);
      setNuevaAccion({ fechaCompromiso: new Date().toISOString() });
    },
    onError: () => {
      showError('Error al crear la accion correctiva');
    },
  });

  const handleCrearAccion = () => {
    if (nuevaAccion.descripcion && nuevaAccion.fechaCompromiso) {
      crearAccionMutation.mutate({
        ...nuevaAccion as CreateAccionDto,
        hallazgoId: id!,
      });
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!hallazgo) {
    return <Typography>Hallazgo no encontrado</Typography>;
  }

  const canModifyHallazgo = !isTechnician || hallazgo.inspeccion?.asignadoA?.id === user?.id;

  return (
    <Box>
      <PageHeader
        title={hallazgo.titulo}
        breadcrumbs={[
          { label: 'Hallazgos', path: '/hallazgos' },
          { label: hallazgo.titulo },
        ]}
        action={{
          label: 'Volver',
          onClick: () => navigate('/hallazgos'),
          icon: 'back',
        }}
      />

      {isTechnician && !canModifyHallazgo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Este hallazgo pertenece a una inspección asignada a otro inspector. Podés consultarlo, pero no modificarlo ni adjuntar evidencias.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Info del Hallazgo */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informacion del Hallazgo
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nivel de Riesgo
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={hallazgo.nivelRiesgo} type="riesgo" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripcion
                  </Typography>
                  <Typography variant="body2">{hallazgo.descripcion}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ubicacion
                  </Typography>
                  <Typography variant="body2">{hallazgo.ubicacionTexto}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Sector de Inspeccion
                  </Typography>
                  <Typography variant="body2">
                    {hallazgo.inspeccion?.sector || '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de Deteccion
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(hallazgo.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </Typography>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Evidencias fotográficas ({photoPreviews.length})
                    </Typography>
                    {photoLoading && <CircularProgress size={18} aria-label="Cargando fotografías" />}
                  </Box>
                  {photoError && <Alert severity="error" sx={{ mb: 1 }}>{photoError}</Alert>}
                  {!photoLoading && !photoError && photoPreviews.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No hay fotografías asociadas</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                    {photoPreviews.map((preview) => (
                      <Box
                        key={preview.filename}
                        component="button"
                        type="button"
                        onClick={() => setSelectedPhoto(preview)}
                        aria-label={`Ampliar evidencia ${preview.filename}`}
                        sx={{ border: 0, p: 0, background: 'none', cursor: 'pointer', flex: '0 0 auto' }}
                      >
                        <Box
                          component="img"
                          src={preview.url}
                          alt={`Evidencia ${preview.filename}`}
                          sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1, display: 'block' }}
                        />
                      </Box>
                    ))}
                  </Box>
              <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<PhotoLibraryIcon />}
                    disabled={uploadingPhotos || !canModifyHallazgo}
                  >
                    Seleccionar fotografías
                    <input
                      hidden
                      multiple
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => handlePhotoSelection(event.target.files)}
                    />
              </Button>
                  {selectedFiles.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {selectedFiles.map((file) => (
                        <Box key={`${file.name}-${file.lastModified}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {file.name}
                          </Typography>
                          {uploadProgress[file.name] !== undefined && (
                            <LinearProgress variant="determinate" value={uploadProgress[file.name]} sx={{ width: 100 }} />
                          )}
                        </Box>
                      ))}
                      <Button variant="contained" size="small" onClick={handleUploadPhotos} disabled={uploadingPhotos}>
                        {uploadingPhotos ? 'Cargando...' : 'Subir fotografías'}
                      </Button>
                    </Box>
                  )}
                  {uploadError && <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>}
                  {uploadSuccess && <Alert severity="success" sx={{ mt: 1 }}>{uploadSuccess}</Alert>}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones Correctivas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Acciones Correctivas</Typography>
                {!isTechnician && canModifyHallazgo && <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAccionDialogOpen(true)}
                >
                  Nueva Accion
                </Button>}
              </Box>
              <Divider sx={{ mb: 2 }} />

              {!hallazgo.accionesCorrectivas || hallazgo.accionesCorrectivas.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No hay acciones correctivas asignadas
                </Typography>
              ) : (
                <List>
                  {hallazgo.accionesCorrectivas.map((accion) => (
                    <ListItem
                      key={accion.id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/acciones/${accion.id}`)}
                    >
                      <ListItemText
                        primary={accion.descripcion}
                        secondary={`Compromiso: ${format(
                          new Date(accion.fechaCompromiso),
                          'dd/MM/yyyy',
                          { locale: es }
                        )}`}
                      />
                      <ListItemSecondaryAction>
                        <StatusChip status={accion.estado} type="estado" />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} maxWidth="md">
        <DialogTitle sx={{ pr: 6 }}>
          Evidencia fotográfica
          <IconButton aria-label="Cerrar visor" onClick={() => setSelectedPhoto(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {selectedPhoto && (
            <Box component="img" src={selectedPhoto.url} alt={`Evidencia ${selectedPhoto.filename}`} sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para nueva accion */}
      <Dialog
        open={accionDialogOpen}
        onClose={() => setAccionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva Accion Correctiva</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripcion de la accion"
                value={nuevaAccion.descripcion || ''}
                onChange={(e) =>
                  setNuevaAccion({ ...nuevaAccion, descripcion: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Fecha de compromiso"
                value={nuevaAccion.fechaCompromiso ? new Date(nuevaAccion.fechaCompromiso) : null}
                onChange={(date) =>
                  setNuevaAccion({
                    ...nuevaAccion,
                    fechaCompromiso: date?.toISOString() || '',
                  })
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Responsable"
                value={nuevaAccion.responsableId || ''}
                onChange={(e) =>
                  setNuevaAccion({ ...nuevaAccion, responsableId: e.target.value })
                }
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {tecnicos?.map((tecnico) => (
                  <MenuItem key={tecnico.id} value={tecnico.id}>
                    {tecnico.nombre} {tecnico.apellido}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="O indicar responsable (texto)"
                value={nuevaAccion.responsableTexto || ''}
                onChange={(e) =>
                  setNuevaAccion({ ...nuevaAccion, responsableTexto: e.target.value })
                }
                helperText="Usar si el responsable no esta en el sistema"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccionDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrearAccion}
            disabled={!nuevaAccion.descripcion || crearAccionMutation.isPending}
          >
            {crearAccionMutation.isPending ? 'Creando...' : 'Crear Accion'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
