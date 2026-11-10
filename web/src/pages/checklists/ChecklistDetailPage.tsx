import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { checklistsApi, CreateChecklistItemDto } from '../../api/checklists';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { ChecklistItem } from '../../types';

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [newItem, setNewItem] = useState<CreateChecklistItemDto>({
    descripcion: '',
    orden: 1,
    obligatorio: true,
  });

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['checklist', id],
    queryFn: () => checklistsApi.getById(id!),
    enabled: !!id,
  });

  const addItemMutation = useMutation({
    mutationFn: (data: CreateChecklistItemDto) => checklistsApi.addItem(id!, data),
    onSuccess: () => {
      showSuccess('Item agregado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setAddItemDialogOpen(false);
      setNewItem({ descripcion: '', orden: 1, obligatorio: true });
    },
    onError: () => {
      showError('Error al agregar el item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: Partial<CreateChecklistItemDto>;
    }) => checklistsApi.updateItem(id!, itemId, data),
    onSuccess: () => {
      showSuccess('Item actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setEditItemDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      showError('Error al actualizar el item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => checklistsApi.deleteItem(id!, itemId),
    onSuccess: () => {
      showSuccess('Item eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['checklist', id] });
      setDeleteItemDialogOpen(false);
      setSelectedItem(null);
    },
    onError: () => {
      showError('Error al eliminar el item');
    },
  });

  const handleAddItem = () => {
    if (newItem.descripcion.trim()) {
      const nextOrder = (checklist?.items || []).reduce(
        (max, item) => Math.max(max, item.orden),
        0,
      ) + 1;
      addItemMutation.mutate({ ...newItem, orden: nextOrder });
    }
  };

  const handleUpdateItem = () => {
    if (selectedItem) {
      updateItemMutation.mutate({
        itemId: selectedItem.id,
        data: {
          descripcion: selectedItem.descripcion,
          obligatorio: selectedItem.obligatorio,
        },
      });
    }
  };

  const handleDeleteItem = () => {
    if (selectedItem) {
      deleteItemMutation.mutate(selectedItem.id);
    }
  };

  const openEditDialog = (item: ChecklistItem) => {
    setSelectedItem({ ...item });
    setEditItemDialogOpen(true);
  };

  const openDeleteDialog = (item: ChecklistItem) => {
    setSelectedItem(item);
    setDeleteItemDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (!checklist) {
    return <Typography>Checklist no encontrado</Typography>;
  }

  return (
    <Box>
      <PageHeader
        title={checklist.nombre}
        breadcrumbs={[
          { label: 'Checklists', path: '/checklists' },
          { label: checklist.nombre },
        ]}
        action={{
          label: 'Volver',
          onClick: () => navigate('/checklists'),
          icon: 'back',
        }}
      />

      <Grid container spacing={3}>
        {/* Info del Checklist */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informacion
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tipo
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={checklist.tipo} color="primary" size="small" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={checklist.activo ? 'Activo' : 'Inactivo'}
                      color={checklist.activo ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>

                {checklist.descripcion && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Descripcion
                    </Typography>
                    <Typography variant="body2">{checklist.descripcion}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Items
                  </Typography>
                  <Typography variant="body2">{checklist.items?.length || 0} items</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Items */}
        <Grid item xs={12} md={8}>
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
                <Typography variant="h6">Items del Checklist</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddItemDialogOpen(true)}
                >
                  Agregar Item
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {!checklist.items || checklist.items.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No hay items. Agrega el primer item al checklist.
                </Typography>
              ) : (
                <List>
                  {checklist.items
                    .sort((a, b) => a.orden - b.orden)
                    .map((item, index) => (
                      <Paper key={item.id} sx={{ mb: 1 }}>
                        <ListItem>
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <DragIcon color="disabled" />
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ ml: 1, minWidth: 24 }}
                            >
                              {index + 1}.
                            </Typography>
                          </Box>
                          <ListItemText
                            primary={item.descripcion}
                            secondary={item.obligatorio ? 'Obligatorio' : 'Opcional'}
                          />
                          <ListItemSecondaryAction>
                            <IconButton size="small" onClick={() => openEditDialog(item)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(item)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Paper>
                    ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para agregar item */}
      <Dialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agregar Item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Descripcion"
            multiline
            rows={2}
            value={newItem.descripcion}
            onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Checkbox
              checked={newItem.obligatorio}
              onChange={(e) => setNewItem({ ...newItem, obligatorio: e.target.checked })}
            />
            <Typography>Item obligatorio</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!newItem.descripcion.trim() || addItemMutation.isPending}
          >
            {addItemMutation.isPending ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para editar item */}
      <Dialog
        open={editItemDialogOpen}
        onClose={() => setEditItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Item</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Descripcion"
            multiline
            rows={2}
            value={selectedItem?.descripcion || ''}
            onChange={(e) =>
              setSelectedItem(selectedItem ? { ...selectedItem, descripcion: e.target.value } : null)
            }
            sx={{ mt: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Checkbox
              checked={selectedItem?.obligatorio || false}
              onChange={(e) =>
                setSelectedItem(
                  selectedItem ? { ...selectedItem, obligatorio: e.target.checked } : null
                )
              }
            />
            <Typography>Item obligatorio</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItemDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleUpdateItem}
            disabled={updateItemMutation.isPending}
          >
            {updateItemMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para eliminar item */}
      <ConfirmDialog
        open={deleteItemDialogOpen}
        title="Eliminar Item"
        message={`Esta seguro de eliminar este item? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="error"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteItemDialogOpen(false)}
        isLoading={deleteItemMutation.isPending}
      />
    </Box>
  );
}
