import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Grid,
  Typography,
  Alert,
} from '@mui/material';
import { checklistsApi } from '../../api/checklists';
import { inspeccionesApi, CreateInspeccionDto } from '../../api/inspecciones';
import PageHeader from '../../components/common/PageHeader';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function NuevaInspeccionPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useSnackbar();
  const [error, setError] = useState<string | null>(null);

  const { data: checklists, isLoading: checklistsLoading } = useQuery({
    queryKey: ['checklists', 'activos'],
    queryFn: () => checklistsApi.getAll({ activo: true }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInspeccionDto>();

  const createMutation = useMutation({
    mutationFn: inspeccionesApi.create,
    onSuccess: (inspeccion) => {
      showSuccess('Inspeccion creada exitosamente');
      navigate(`/inspecciones/${inspeccion.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Error al crear la inspeccion');
      showError('Error al crear la inspeccion');
    },
  });

  const onSubmit = (data: CreateInspeccionDto) => {
    setError(null);
    createMutation.mutate(data);
  };

  return (
    <Box>
      <PageHeader
        title="Nueva Inspeccion"
        breadcrumbs={[
          { label: 'Inspecciones', path: '/inspecciones' },
          { label: 'Nueva Inspeccion' },
        ]}
        action={{
          label: 'Volver',
          onClick: () => navigate('/inspecciones'),
          icon: 'back',
        }}
      />

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Datos de la Inspeccion
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Checklist"
                  error={!!errors.checklistId}
                  helperText={errors.checklistId?.message}
                  disabled={checklistsLoading}
                  {...register('checklistId', {
                    required: 'Selecciona un checklist',
                  })}
                >
                  {checklists?.map((checklist) => (
                    <MenuItem key={checklist.id} value={checklist.id}>
                      {checklist.nombre} ({checklist.tipo})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sector / Area"
                  placeholder="Ej: Planta de Produccion - Sector A"
                  error={!!errors.sector}
                  helperText={errors.sector?.message}
                  {...register('sector', {
                    required: 'El sector es requerido',
                    minLength: {
                      value: 3,
                      message: 'El sector debe tener al menos 3 caracteres',
                    },
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Descripcion (opcional)"
                  placeholder="Descripcion adicional de la inspeccion..."
                  {...register('descripcion')}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/inspecciones')}
                    disabled={createMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Creando...' : 'Iniciar Inspeccion'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
