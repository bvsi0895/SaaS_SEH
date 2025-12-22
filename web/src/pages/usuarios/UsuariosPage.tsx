import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as ResetIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { usuariosApi, CreateUsuarioDto, UpdateUsuarioDto } from '../../api/usuarios';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { Usuario, Rol } from '../../types';

const rolLabels: Record<Rol, string> = {
  ADMIN_EMPRESA: 'Administrador',
  SUPERVISOR: 'Supervisor',
  TECNICO: 'Tecnico',
};

const rolColors: Record<Rol, 'primary' | 'secondary' | 'default'> = {
  ADMIN_EMPRESA: 'primary',
  SUPERVISOR: 'secondary',
  TECNICO: 'default',
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.getAll,
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateUsuarioDto>();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    formState: { errors: errorsEdit },
  } = useForm<UpdateUsuarioDto>();

  const createMutation = useMutation({
    mutationFn: usuariosApi.create,
    onSuccess: () => {
      showSuccess('Usuario creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setCreateDialogOpen(false);
      resetCreate();
    },
    onError: () => {
      showError('Error al crear el usuario');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUsuarioDto }) =>
      usuariosApi.update(id, data),
    onSuccess: () => {
      showSuccess('Usuario actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setEditDialogOpen(false);
    },
    onError: () => {
      showError('Error al actualizar el usuario');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usuariosApi.delete,
    onSuccess: () => {
      showSuccess('Usuario eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      showError('Error al eliminar el usuario');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usuariosApi.changePassword(id, password),
    onSuccess: () => {
      showSuccess('Contrasena actualizada exitosamente');
      setResetPasswordDialogOpen(false);
      setNewPassword('');
    },
    onError: () => {
      showError('Error al cambiar la contrasena');
    },
  });

  const onCreateSubmit = (data: CreateUsuarioDto) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdateUsuarioDto) => {
    if (selectedUser) {
      updateMutation.mutate({ id: selectedUser.id, data });
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const handleResetPassword = () => {
    if (selectedUser && newPassword) {
      changePasswordMutation.mutate({ id: selectedUser.id, password: newPassword });
    }
  };

  const openEditDialog = (user: Usuario) => {
    setSelectedUser(user);
    setEditValue('nombre', user.nombre);
    setEditValue('apellido', user.apellido);
    setEditValue('rol', user.rol);
    setEditValue('activo', user.activo);
    setEditDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'nombre',
      headerName: 'Nombre',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => `${params.row.nombre} ${params.row.apellido}`,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'rol',
      headerName: 'Rol',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={rolLabels[params.value as Rol]}
          color={rolColors[params.value as Rol]}
          size="small"
        />
      ),
    },
    {
      field: 'activo',
      headerName: 'Estado',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Activo' : 'Inactivo'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Usuario>) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => openEditDialog(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cambiar contrasena">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedUser(params.row);
                setResetPasswordDialogOpen(true);
              }}
            >
              <ResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setSelectedUser(params.row);
                setDeleteDialogOpen(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Usuarios"
        subtitle="Gestion de usuarios del sistema"
        action={{
          label: 'Nuevo Usuario',
          onClick: () => {
            resetCreate();
            setCreateDialogOpen(true);
          },
          icon: 'add',
        }}
      />

      <Card>
        <DataGrid
          rows={usuarios || []}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Card>

      {/* Dialog para crear */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitCreate(onCreateSubmit)}>
          <DialogTitle>Nuevo Usuario</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  error={!!errorsCreate.nombre}
                  helperText={errorsCreate.nombre?.message}
                  {...registerCreate('nombre', { required: 'Nombre requerido' })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Apellido"
                  error={!!errorsCreate.apellido}
                  helperText={errorsCreate.apellido?.message}
                  {...registerCreate('apellido', { required: 'Apellido requerido' })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  error={!!errorsCreate.email}
                  helperText={errorsCreate.email?.message}
                  {...registerCreate('email', { required: 'Email requerido' })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contrasena"
                  type="password"
                  error={!!errorsCreate.password}
                  helperText={errorsCreate.password?.message}
                  {...registerCreate('password', {
                    required: 'Contrasena requerida',
                    minLength: { value: 8, message: 'Minimo 8 caracteres' },
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Rol"
                  defaultValue="TECNICO"
                  error={!!errorsCreate.rol}
                  {...registerCreate('rol', { required: 'Rol requerido' })}
                >
                  <MenuItem value="TECNICO">Tecnico</MenuItem>
                  <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                  <MenuItem value="ADMIN_EMPRESA">Administrador</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para editar */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)}>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre"
                  error={!!errorsEdit.nombre}
                  {...registerEdit('nombre')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Apellido"
                  error={!!errorsEdit.apellido}
                  {...registerEdit('apellido')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Rol"
                  defaultValue={selectedUser?.rol}
                  {...registerEdit('rol')}
                >
                  <MenuItem value="TECNICO">Tecnico</MenuItem>
                  <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                  <MenuItem value="ADMIN_EMPRESA">Administrador</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="Estado"
                  defaultValue={selectedUser?.activo}
                  {...registerEdit('activo')}
                >
                  <MenuItem value="true">Activo</MenuItem>
                  <MenuItem value="false">Inactivo</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog para cambiar contrasena */}
      <Dialog
        open={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cambiar Contrasena</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingrese la nueva contrasena para {selectedUser?.nombre} {selectedUser?.apellido}
          </Typography>
          <TextField
            fullWidth
            label="Nueva Contrasena"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={!newPassword || changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? 'Cambiando...' : 'Cambiar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para eliminar */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Usuario"
        message={`Esta seguro de eliminar al usuario ${selectedUser?.nombre} ${selectedUser?.apellido}?`}
        confirmLabel="Eliminar"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
}
