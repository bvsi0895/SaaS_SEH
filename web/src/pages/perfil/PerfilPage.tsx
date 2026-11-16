import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Avatar,
  Alert,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { authApi } from '../../api/auth';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const rolLabels = {
  ADMIN_EMPRESA: 'Administrador de Empresa',
  SUPERVISOR: 'Supervisor',
  TECNICO: 'Tecnico',
};

export default function PerfilPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      showSuccess('Contraseña actualizada exitosamente');
      setSuccess(true);
      reset();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cambiar la contraseña';
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Box>
      <PageHeader title="Mi Perfil" subtitle="Informacion de tu cuenta" />

      <Grid container spacing={3}>
        {/* Info del usuario */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: 40,
                }}
              >
                {user.nombre.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {user.nombre} {user.apellido}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>
              <Chip
                label={rolLabels[user.rol]}
                color="primary"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Cambiar contraseña */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cambiar contraseña
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Contraseña actualizada exitosamente
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      label="Contraseña actual"
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                              onClick={() => setShowCurrentPassword((visible) => !visible)}
                              edge="end"
                            >
                              {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      {...register('currentPassword', {
                        required: 'Ingresa tu contraseña actual',
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      label="Nueva contraseña"
                      error={!!errors.newPassword}
                      helperText={errors.newPassword?.message || 'Mínimo 8 caracteres'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                              onClick={() => setShowNewPassword((visible) => !visible)}
                              edge="end"
                            >
                              {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      {...register('newPassword', {
                        required: 'Ingresa la nueva contraseña',
                        minLength: {
                          value: 8,
                          message: 'La contraseña debe tener al menos 8 caracteres',
                        },
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      label="Confirmar nueva contraseña"
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                              onClick={() => setShowConfirmPassword((visible) => !visible)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      {...register('confirmPassword', {
                        required: 'Confirma la nueva contraseña',
                        validate: (value) =>
                          value === newPassword || 'Las contraseñas no coinciden',
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isLoading}
                      sx={{ mt: 1 }}
                    >
                      {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
