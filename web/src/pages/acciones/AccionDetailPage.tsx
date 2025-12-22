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
  Skeleton,
  Chip,
  Alert,
} from '@mui/material';
import {
  PlayArrow as IniciarIcon,
  CheckCircle as ResolverIcon,
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { accionesApi } from '../../api/acciones';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function AccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [iniciarDialogOpen, setIniciarDialogOpen] = useState(false);
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);

  const { data: accion, isLoading } = useQuery({
    queryKey: ['accion', id],
    queryFn: () => accionesApi.getById(id!),
    enabled: !!id,
  });

  const iniciarMutation = useMutation({
    mutationFn: () => accionesApi.iniciar(id!),
    onSuccess: () => {
      showSuccess('Accion iniciada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['accion', id] });
      setIniciarDialogOpen(false);
    },
    onError: () => {
      showError('Error al iniciar la accion');
    },
  });

  const resolverMutation = useMutation({
    mutationFn: () => accionesApi.resolver(id!),
    onSuccess: () => {
      showSuccess('Accion resuelta exitosamente');
      queryClient.invalidateQueries({ queryKey: ['accion', id] });
      setResolverDialogOpen(false);
    },
    onError: () => {
      showError('Error al resolver la accion');
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!accion) {
    return <Typography>Accion no encontrada</Typography>;
  }

  const isVencida =
    isPast(new Date(accion.fechaCompromiso)) &&
    (accion.estado === 'PENDIENTE' || accion.estado === 'EN_PROGRESO');

  return (
    <Box>
      <PageHeader
        title="Detalle de Accion Correctiva"
        breadcrumbs={[
          { label: 'Acciones Correctivas', path: '/acciones' },
          { label: 'Detalle' },
        ]}
        action={{
          label: 'Volver',
          onClick: () => navigate('/acciones'),
          icon: 'back',
        }}
      />

      {isVencida && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Esta accion correctiva esta vencida. La fecha de compromiso era el{' '}
          {format(new Date(accion.fechaCompromiso), "dd/MM/yyyy", { locale: es })}.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Info de la Accion */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informacion de la Accion
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={accion.estado} type="estado" />
                    {isVencida && (
                      <Chip
                        label="Vencida"
                        color="error"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripcion
                  </Typography>
                  <Typography variant="body2">{accion.descripcion}</Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Responsable
                  </Typography>
                  <Typography variant="body2">
                    {accion.responsable
                      ? `${accion.responsable.nombre} ${accion.responsable.apellido}`
                      : accion.responsableTexto || 'Sin asignar'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha de Compromiso
                  </Typography>
                  <Typography
                    variant="body2"
                    color={isVencida ? 'error' : 'inherit'}
                  >
                    {format(new Date(accion.fechaCompromiso), "dd/MM/yyyy", {
                      locale: es,
                    })}
                  </Typography>
                </Box>

                {accion.fechaCierre && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de Cierre
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(accion.fechaCierre), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {accion.estado === 'PENDIENTE' && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<IniciarIcon />}
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => setIniciarDialogOpen(true)}
                >
                  Iniciar Accion
                </Button>
              )}

              {accion.estado === 'EN_PROGRESO' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ResolverIcon />}
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => setResolverDialogOpen(true)}
                >
                  Marcar como Resuelta
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Info del Hallazgo */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hallazgo Asociado
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {accion.hallazgo ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Titulo
                    </Typography>
                    <Typography variant="body2">{accion.hallazgo.titulo}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Nivel de Riesgo
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip
                        status={accion.hallazgo.nivelRiesgo}
                        type="riesgo"
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sector
                    </Typography>
                    <Typography variant="body2">
                      {accion.hallazgo.inspeccion?.sector || '-'}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/hallazgos/${accion.hallazgo!.id}`)}
                  >
                    Ver Hallazgo Completo
                  </Button>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  No hay informacion del hallazgo
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para iniciar */}
      <ConfirmDialog
        open={iniciarDialogOpen}
        title="Iniciar Accion Correctiva"
        message="Esta seguro de marcar esta accion como 'En Progreso'?"
        confirmLabel="Iniciar"
        onConfirm={() => iniciarMutation.mutate()}
        onCancel={() => setIniciarDialogOpen(false)}
        isLoading={iniciarMutation.isPending}
      />

      {/* Dialog para resolver */}
      <ConfirmDialog
        open={resolverDialogOpen}
        title="Resolver Accion Correctiva"
        message="Esta seguro de marcar esta accion como 'Resuelta'? Esta accion no se puede deshacer."
        confirmLabel="Resolver"
        confirmColor="success"
        onConfirm={() => resolverMutation.mutate()}
        onCancel={() => setResolverDialogOpen(false)}
        isLoading={resolverMutation.isPending}
      />
    </Box>
  );
}
