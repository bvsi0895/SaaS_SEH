import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { checklistsApi, CreateChecklistDto } from '../../api/checklists';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { Checklist, TipoChecklist } from '../../types';

const tipoColors: Record<TipoChecklist, string> = {
  GENERAL: '#1976d2',
  EPP: '#7b1fa2',
  ORDEN_LIMPIEZA: '#2e7d32',
  RIESGO_QUIMICO: '#ef6c00',
  MAQUINARIA: '#455a64',
  ERGONOMIA: '#00838f',
  INCENDIO: '#d32f2f',
  OTRO: '#757575',
};

export default function ChecklistsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [formData, setFormData] = useState<CreateChecklistDto>({
    nombre: '',
    descripcion: '',
    tipo: 'GENERAL',
  });

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: () => checklistsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: checklistsApi.create,
    onSuccess: (checklist) => {
      showSuccess('Checklist creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setCreateDialogOpen(false);
      navigate(`/checklists/${checklist.id}`);
    },
    onError: () => {
      showError('Error al crear el checklist');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      checklistsApi.duplicate(id, nombre),
    onSuccess: () => {
      showSuccess('Checklist duplicado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setDuplicateDialogOpen(false);
    },
    onError: () => {
      showError('Error al duplicar el checklist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: checklistsApi.delete,
    onSuccess: () => {
      showSuccess('Checklist eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      showError('Error al eliminar el checklist');
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleDuplicate = () => {
    if (selectedChecklist) {
      duplicateMutation.mutate({ id: selectedChecklist.id, nombre: nuevoNombre });
    }
  };

  const handleDelete = () => {
    if (selectedChecklist) {
      deleteMutation.mutate(selectedChecklist.id);
    }
  };

  const openDuplicateDialog = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setNuevoNombre(`${checklist.nombre} (copia)`);
    setDuplicateDialogOpen(true);
  };

  const openDeleteDialog = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="Checklists"
        subtitle="Gestiona los checklists de inspeccion"
        action={{
          label: 'Nuevo Checklist',
          onClick: () => {
            setFormData({ nombre: '', descripcion: '', tipo: 'GENERAL' });
            setCreateDialogOpen(true);
          },
          icon: 'add',
        }}
      />

      {isLoading ? (
        <Typography>Cargando...</Typography>
      ) : !checklists || checklists.length === 0 ? (
        <EmptyState
          title="No hay checklists"
          description="Crea tu primer checklist para comenzar a realizar inspecciones"
          action={{
            label: 'Crear Checklist',
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      ) : (
        <Grid container spacing={3}>
          {checklists.map((checklist) => (
            <Grid item xs={12} sm={6} md={4} key={checklist.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/checklists/${checklist.id}`)}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={checklist.tipo}
                      size="small"
                      sx={{
                        bgcolor: tipoColors[checklist.tipo],
                        color: 'white',
                      }}
                    />
                    {!checklist.activo && (
                      <Chip label="Inactivo" size="small" color="default" />
                    )}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {checklist.nombre}
                  </Typography>
                  {checklist.descripcion && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {checklist.descripcion}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {checklist.items?.length || 0} items
                  </Typography>
                </CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    p: 1,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title="Ver detalle">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/checklists/${checklist.id}`)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicar">
                    <IconButton
                      size="small"
                      onClick={() => openDuplicateDialog(checklist)}
                    >
                      <DuplicateIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(checklist)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para crear */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nuevo Checklist</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Tipo"
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value as TipoChecklist })
                }
              >
                <MenuItem value="SEGURIDAD">Seguridad</MenuItem>
                <MenuItem value="HIGIENE">Higiene</MenuItem>
                <MenuItem value="AMBIENTAL">Ambiental</MenuItem>
                <MenuItem value="EPP">EPP</MenuItem>
                <MenuItem value="INCENDIO">Incendio</MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripcion (opcional)"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!formData.nombre || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para duplicar */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Duplicar Checklist</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre del nuevo checklist"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleDuplicate}
            disabled={!nuevoNombre || duplicateMutation.isPending}
          >
            {duplicateMutation.isPending ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para eliminar */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar Checklist"
        message={`Esta seguro de eliminar el checklist "${selectedChecklist?.nombre}"? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
}
