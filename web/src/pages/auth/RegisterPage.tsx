import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import type { RegisterData } from '../../types';

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" component="h2" textAlign="center" mb={3}>
        Crear Cuenta
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="Nombre"
          margin="normal"
          autoComplete="given-name"
          error={!!errors.nombre}
          helperText={errors.nombre?.message}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person color="action" />
              </InputAdornment>
            ),
          }}
          {...register('nombre', {
            required: 'El nombre es requerido',
            minLength: {
              value: 2,
              message: 'El nombre debe tener al menos 2 caracteres',
            },
          })}
        />

        <TextField
          fullWidth
          label="Apellido"
          margin="normal"
          autoComplete="family-name"
          error={!!errors.apellido}
          helperText={errors.apellido?.message}
          {...register('apellido', {
            required: 'El apellido es requerido',
            minLength: {
              value: 2,
              message: 'El apellido debe tener al menos 2 caracteres',
            },
          })}
        />
      </Box>

      <TextField
        fullWidth
        label="Correo electronico"
        type="email"
        margin="normal"
        autoComplete="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
        {...register('email', {
          required: 'El correo es requerido',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Correo electronico invalido',
          },
        })}
      />

      <TextField
        fullWidth
        label="Contrasena"
        type={showPassword ? 'text' : 'password'}
        margin="normal"
        autoComplete="new-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        {...register('password', {
          required: 'La contrasena es requerida',
          minLength: {
            value: 8,
            message: 'La contrasena debe tener al menos 8 caracteres',
          },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            message: 'Debe contener mayuscula, minuscula y numero',
          },
        })}
      />

      <TextField
        fullWidth
        label="Confirmar contrasena"
        type={showPassword ? 'text' : 'password'}
        margin="normal"
        autoComplete="new-password"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
        }}
        {...register('confirmPassword', {
          required: 'Confirma tu contrasena',
          validate: (value) =>
            value === password || 'Las contrasenas no coinciden',
        })}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{ mt: 3, mb: 2 }}
      >
        {isLoading ? 'Registrando...' : 'Registrarse'}
      </Button>

      <Box textAlign="center">
        <Typography variant="body2" color="text.secondary">
          Ya tienes cuenta?{' '}
          <Link component={RouterLink} to="/login">
            Inicia sesion
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
