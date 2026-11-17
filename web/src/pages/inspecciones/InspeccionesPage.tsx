import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Card, CardContent, TextField, MenuItem, IconButton, Tooltip, Grid, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility as ViewIcon, PictureAsPdf as PdfIcon, PlayArrow as StartIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { inspeccionesApi } from '../../api/inspecciones';
import { usuariosApi } from '../../api/usuarios';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import type { Inspeccion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const personName = (person?: { nombre: string; apellido: string }) => person ? `${person.nombre} ${person.apellido}` : '-';
const dateValue = (value?: string) => value ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es }) : '-';

export default function InspeccionesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [responsableFilter, setResponsableFilter] = useState('');
  const { user, activeContextId } = useAuth();
  const isTechnician = user?.rol === 'TECNICO';

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['usuarios', 'tecnicos', activeContextId, user?.id, user?.rol],
    queryFn: usuariosApi.getTecnicos,
    enabled: !isTechnician,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['inspecciones', activeContextId, user?.id, user?.rol, page, pageSize, estadoFilter, responsableFilter],
    queryFn: () => inspeccionesApi.getAll({ page: page + 1, limit: pageSize, estado: estadoFilter || undefined, asignadoAId: responsableFilter || undefined }),
  });
  const iniciarMutation = useMutation({
    mutationFn: inspeccionesApi.iniciar,
    onSuccess: (inspection) => {
      showSuccess('Inspección iniciada');
      queryClient.invalidateQueries({ queryKey: ['inspecciones'] });
      queryClient.invalidateQueries({ queryKey: ['inspeccion', inspection.id] });
    },
    onError: () => showError('No se pudo iniciar la inspección'),
  });

  const handleDownloadPDF = async (id: string) => {
    try {
      const blob = await inspeccionesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `inspeccion-${id}.pdf`; a.click(); window.URL.revokeObjectURL(url);
    } catch { showError('No se pudo descargar el PDF'); }
  };

  const columns: GridColDef[] = [
    { field: 'sector', headerName: 'Sector', flex: 1, minWidth: 150 },
    { field: 'checklist', headerName: 'Checklist', flex: 1, minWidth: 150, valueGetter: (params) => params.row.checklist?.nombre || '-' },
    { field: 'creadoPor', headerName: 'Creada por', flex: 1, minWidth: 150, valueGetter: (params) => personName(params.row.creadoPor || params.row.usuario) },
    { field: 'asignadoA', headerName: 'Asignada a', flex: 1, minWidth: 150, valueGetter: (params) => personName(params.row.asignadoA || params.row.usuario) },
    { field: 'fechaProgramada', headerName: 'Fecha programada', width: 160, valueGetter: (params) => dateValue(params.row.fechaProgramada) },
    { field: 'estado', headerName: 'Estado', width: 130, renderCell: (params: GridRenderCellParams) => <StatusChip status={params.value} type="estado" /> },
    { field: 'acciones', headerName: 'Acciones', width: 160, sortable: false, renderCell: (params: GridRenderCellParams<Inspeccion>) => <Box>
      <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => navigate(`/inspecciones/${params.row.id}`)}><ViewIcon /></IconButton></Tooltip>
      {params.row.estado === 'PENDIENTE' && <Tooltip title="Iniciar inspección"><IconButton size="small" onClick={() => iniciarMutation.mutate(params.row.id)} disabled={iniciarMutation.isPending}><StartIcon /></IconButton></Tooltip>}
      {params.row.estado === 'COMPLETADA' && <Tooltip title="Descargar PDF"><IconButton size="small" onClick={() => handleDownloadPDF(params.row.id)}><PdfIcon /></IconButton></Tooltip>}
    </Box> },
  ];

  return <Box>
    <PageHeader title="Inspecciones" subtitle={isTechnician ? 'Inspecciones asignadas a ti' : 'Inspecciones del contexto autorizado'} action={{ label: 'Nueva inspección', onClick: () => navigate('/inspecciones/nueva'), icon: 'add' }} />
    <Card sx={{ mb: 3 }}><CardContent><Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={4}><TextField fullWidth select label="Estado" value={estadoFilter} onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }}><MenuItem value="">Todos</MenuItem><MenuItem value="PENDIENTE">Pendiente</MenuItem><MenuItem value="EN_PROGRESO">En progreso</MenuItem><MenuItem value="COMPLETADA">Completada</MenuItem><MenuItem value="CANCELADA">Cancelada</MenuItem></TextField></Grid>
      {!isTechnician && <Grid item xs={12} md={4}><TextField fullWidth select label="Responsable" value={responsableFilter} onChange={(e) => { setResponsableFilter(e.target.value); setPage(0); }}><MenuItem value="">Todos</MenuItem>{tecnicos.map((tecnico) => <MenuItem key={tecnico.id} value={tecnico.id}>{tecnico.nombre} {tecnico.apellido}</MenuItem>)}</TextField></Grid>}
      <Grid item xs={12} md={4}><Button onClick={() => { setEstadoFilter(''); setResponsableFilter(''); setPage(0); }}>Limpiar filtros</Button></Grid>
    </Grid></CardContent></Card>
    <Card><DataGrid rows={data?.data || []} columns={columns} rowCount={data?.total || 0} loading={isLoading} paginationMode={data && !data.isPaginated ? 'client' : 'server'} paginationModel={{ page, pageSize }} onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }} pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick autoHeight sx={{ border: 'none', '& .MuiDataGrid-cell:focus': { outline: 'none' } }} /></Card>
  </Box>;
}

