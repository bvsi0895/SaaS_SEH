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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hallazgosApi } from '../../api/hallazgos';
import { accionesApi, CreateAccionDto } from '../../api/acciones';
import { usuariosApi } from '../../api/usuarios';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DatePicker } from '@mui/x-date-pickers';

export default function HallazgoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [accionDialogOpen, setAccionDialogOpen] = useState(false);
  const [nuevaAccion, setNuevaAccion] = useState<Partial<CreateAccionDto>>({
    fechaCompromiso: new Date().toISOString(),
  });

  const { data: hallazgo, isLoading } = useQuery({
    queryKey: ['hallazgo', id],
    queryFn: () => hallazgosApi.getById(id!),
    enabled: !!id,
  });

  const { data: tecnicos } = useQuery({
    queryKey: ['usuarios', 'tecnicos'],
    queryFn: usuariosApi.getTecnicos,
  });

  const crearAccionMutation = useMutation({
    mutationFn: (data: CreateAccionDto) => accionesApi.create(data),
    onSuccess: () => {
      showSuccess('Accion correctiva creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['hallazgo', id] });
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
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAccionDialogOpen(true)}
                >
                  Nueva Accion
                </Button>
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
