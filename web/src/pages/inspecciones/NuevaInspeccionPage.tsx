import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Box, Card, CardContent, TextField, Button, MenuItem, Grid, Typography, Alert } from '@mui/material';
import { checklistsApi } from '../../api/checklists';
import { inspeccionesApi, CreateInspeccionDto } from '../../api/inspecciones';
import { usuariosApi } from '../../api/usuarios';
import PageHeader from '../../components/common/PageHeader';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import EstablishmentSelector from '../../components/common/EstablishmentSelector';
import { getQueryScope, invalidateInspectionQueries } from '../../queryKeys';

export default function NuevaInspeccionPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const queryClient = useQueryClient();
  const { user, activeContextId } = useAuth();
  const isTechnician = user?.rol === 'TECNICO';
  const queryScope = getQueryScope(activeContextId, user?.id, user?.rol);
  const [error, setError] = useState<string | null>(null);
  const [establecimientoId, setEstablecimientoId] = useState('');

  const { data: checklists, isLoading: checklistsLoading } = useQuery({
    queryKey: ['checklists', 'activos', activeContextId, user?.id, user?.rol],
    queryFn: () => checklistsApi.getAll({ activo: true }),
  });
  const { data: tecnicos = [], isLoading: tecnicosLoading } = useQuery({
    queryKey: ['usuarios', 'tecnicos', activeContextId, user?.id, user?.rol],
    queryFn: usuariosApi.getTecnicos,
    enabled: !isTechnician,
  });
  const { register, handleSubmit, formState: { errors } } = useForm<CreateInspeccionDto>();

  const createMutation = useMutation({
    mutationFn: inspeccionesApi.create,
    onSuccess: async (inspeccion) => {
      showSuccess(inspeccion.estado === 'PENDIENTE' ? 'Inspección creada y asignada' : 'Inspección iniciada');
      await invalidateInspectionQueries(queryClient, queryScope, inspeccion.id);
      navigate(`/inspecciones/${inspeccion.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Error al crear la inspección');
      showError('Error al crear la inspección');
    },
  });

  const onSubmit = (data: CreateInspeccionDto) => {
    setError(null);
    const { fechaProgramada, asignadoAId, ...requiredFields } = data;
    const normalizedAssignee = asignadoAId?.trim();
    const payload: CreateInspeccionDto = {
      ...requiredFields,
      establecimientoId,
      ...(fechaProgramada?.trim()
        ? { fechaProgramada: new Date(`${fechaProgramada}T00:00:00.000Z`).toISOString() }
        : {}),
      ...(normalizedAssignee ? { asignadoAId: normalizedAssignee } : {}),
    };
    if (!establecimientoId) {
      setError('Seleccioná un establecimiento autorizado');
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <Box>
      <PageHeader title="Nueva inspección" breadcrumbs={[{ label: 'Inspecciones', path: '/inspecciones' }, { label: 'Nueva inspección' }]} action={{ label: 'Volver', onClick: () => navigate('/inspecciones'), icon: 'back' }} />
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            <Grid container spacing={3}>
              <Grid item xs={12}><Typography variant="h6" gutterBottom>Datos de la inspección</Typography></Grid>
              <Grid item xs={12} md={6}><EstablishmentSelector value={establecimientoId} onChange={setEstablecimientoId} /></Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth select label="Checklist" error={!!errors.checklistId} helperText={errors.checklistId?.message} disabled={checklistsLoading} {...register('checklistId', { required: 'Selecciona un checklist' })}>
                  {checklists?.map((checklist) => <MenuItem key={checklist.id} value={checklist.id}>{checklist.nombre} ({checklist.tipo})</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Sector / área" error={!!errors.sector} helperText={errors.sector?.message} {...register('sector', { required: 'El sector es requerido', minLength: { value: 3, message: 'El sector debe tener al menos 3 caracteres' } })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Descripción (opcional)" {...register('descripcion')} />
              </Grid>
              {!isTechnician && <>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth select label="Técnico responsable (opcional)" disabled={tecnicosLoading} helperText={tecnicosLoading ? 'Cargando técnicos autorizados...' : 'Si no seleccionas uno, se asignará al creador'} {...register('asignadoAId')}>
                    <MenuItem value="">Asignarme a mí mismo</MenuItem>
                    {tecnicos.filter((tecnico) => tecnico.activo).map((tecnico) => <MenuItem key={tecnico.id} value={tecnico.id}>{tecnico.nombre} {tecnico.apellido}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth type="date" label="Fecha programada (opcional)" InputLabelProps={{ shrink: true }} {...register('fechaProgramada')} />
                </Grid>
              </>}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" onClick={() => navigate('/inspecciones')} disabled={createMutation.isPending}>Cancelar</Button>
                  <Button type="submit" variant="contained" disabled={createMutation.isPending}>{createMutation.isPending ? 'Guardando...' : isTechnician ? 'Iniciar inspección' : 'Crear y asignar'}</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

