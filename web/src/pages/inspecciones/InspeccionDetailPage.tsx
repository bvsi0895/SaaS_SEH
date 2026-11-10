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
  ToggleButtonGroup,
  ToggleButton,
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
import { hallazgosApi, CreateHallazgoDto } from '../../api/hallazgos';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { CumplimientoItem, NivelRiesgo } from '../../types';

export default function InspeccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [observacion, setObservacion] = useState('');
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [observacionesFinal, setObservacionesFinal] = useState('');
  const [hallazgoDialogOpen, setHallazgoDialogOpen] = useState(false);
  const [hallazgoPhoto, setHallazgoPhoto] = useState<File | null>(null);
  const [nuevoHallazgo, setNuevoHallazgo] = useState<Partial<CreateHallazgoDto>>({
    nivelRiesgo: 'MEDIO',
  });

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
      setSelectedItem(null);
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
      if (hallazgoPhoto) {
        subirFotoMutation.mutate({ id: hallazgo.id, file: hallazgoPhoto });
        return;
      }
      finalizarCreacionHallazgo();
    },
    onError: () => {
      showError('Error al crear el hallazgo');
    },
  });

  const subirFotoMutation = useMutation({
    mutationFn: ({ id: hallazgoId, file }: { id: string; file: File }) =>
      hallazgosApi.uploadPhoto(hallazgoId, file),
    onSuccess: () => {
      showSuccess('Hallazgo y fotografía creados exitosamente');
      finalizarCreacionHallazgo();
    },
    onError: () => {
      showError('Hallazgo creado, pero no se pudo adjuntar la fotografía');
      finalizarCreacionHallazgo();
    },
  });

  const finalizarCreacionHallazgo = () => {
    queryClient.invalidateQueries({ queryKey: ['inspeccion', id] });
    setHallazgoDialogOpen(false);
    setHallazgoPhoto(null);
    setNuevoHallazgo({ nivelRiesgo: 'MEDIO' });
  };

  const handleCumplimiento = (itemId: string, cumplimiento: CumplimientoItem) => {
    if (cumplimiento === 'OBSERVACION' || cumplimiento === 'NO_CUMPLE') {
      setSelectedItem(itemId);
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
          cumplimiento: item.cumplimiento === 'PENDIENTE' ? 'OBSERVACION' : item.cumplimiento,
          observacion,
        });
      }
    }
  };

  const handleCrearHallazgo = () => {
    if (nuevoHallazgo.titulo && nuevoHallazgo.descripcion && nuevoHallazgo.ubicacionTexto) {
      crearHallazgoMutation.mutate({
        ...nuevoHallazgo as CreateHallazgoDto,
        inspeccionId: id!,
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
                    Tecnico
                  </Typography>
                  <Typography variant="body2">
                    {inspeccion.usuario?.nombre} {inspeccion.usuario?.apellido}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha Inicio
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(inspeccion.fechaHoraInicio), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
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
                    Progreso
                  </Typography>
                  <Typography variant="body2">
                    {itemsCompletados} / {totalItems} items ({progreso}%)
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

              {isEditable && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => setHallazgoDialogOpen(true)}
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
                          <ToggleButton value="CUMPLE" color="success">
                            <CumpleIcon />
                          </ToggleButton>
                          <ToggleButton value="NO_CUMPLE" color="error">
                            <NoCumpleIcon />
                          </ToggleButton>
                          <ToggleButton value="OBSERVACION" color="warning">
                            <ObservacionIcon />
                          </ToggleButton>
                          <ToggleButton value="NO_APLICA">
                            <NoAplicaIcon />
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
      <Dialog open={!!selectedItem} onClose={() => setSelectedItem(null)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setSelectedItem(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveObservacion}>
            Guardar
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
        onClose={() => setHallazgoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar Hallazgo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titulo"
                value={nuevoHallazgo.titulo || ''}
                onChange={(e) => setNuevoHallazgo({ ...nuevoHallazgo, titulo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripcion"
                value={nuevoHallazgo.descripcion || ''}
                onChange={(e) =>
                  setNuevoHallazgo({ ...nuevoHallazgo, descripcion: e.target.value })
                }
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
                onChange={(e) =>
                  setNuevoHallazgo({ ...nuevoHallazgo, ubicacionTexto: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Button component="label" variant="outlined">
                {hallazgoPhoto ? `Fotografía: ${hallazgoPhoto.name}` : 'Adjuntar fotografía'}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setHallazgoPhoto(event.target.files?.[0] || null)}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                JPG, PNG o WEBP hasta 5 MiB
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHallazgoDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrearHallazgo}
            disabled={crearHallazgoMutation.isPending}
          >
            {crearHallazgoMutation.isPending ? 'Creando...' : 'Crear Hallazgo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
