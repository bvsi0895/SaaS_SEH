import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility as ViewIcon, Warning as WarningIcon } from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { accionesApi } from '../../api/acciones';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import type { AccionCorrectiva } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import EstablishmentSelector from '../../components/common/EstablishmentSelector';
import { getQueryScope, queryKeys } from '../../queryKeys';

export default function AccionesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const { user, activeContextId } = useAuth();
  const queryScope = getQueryScope(activeContextId, user?.id, user?.rol);
  const isTechnician = user?.rol === 'TECNICO';
  const isOverdueFilter = estadoFilter === 'VENCIDAS';

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.actions(queryScope), page, pageSize, estadoFilter, establecimientoId],
    queryFn: async () => {
      if (isTechnician) {
        const rows = await accionesApi.getMisAcciones({
          estado: isOverdueFilter ? undefined : estadoFilter as any || undefined,
          vencidas: isOverdueFilter,
          establecimientoId: establecimientoId || undefined,
        });
        return { data: rows, total: rows.length, isPaginated: false };
      }
      return accionesApi.getAll({
        page: page + 1,
        limit: pageSize,
        estado: isOverdueFilter ? undefined : estadoFilter as any || undefined,
        vencidas: isOverdueFilter,
        establecimientoId: establecimientoId || undefined,
      });
    },
  });

  const isClientPaginated = data ? !data.isPaginated : false;

  const isVencida = (accion: AccionCorrectiva) => {
    return (
      isPast(new Date(accion.fechaCompromiso)) &&
      (accion.estado === 'PENDIENTE' || accion.estado === 'EN_PROGRESO')
    );
  };

  const columns: GridColDef[] = [
    {
      field: 'descripcion',
      headerName: 'Descripcion',
      flex: 1,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams<AccionCorrectiva>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isVencida(params.row) && (
            <Tooltip title="Accion vencida">
              <WarningIcon color="error" fontSize="small" />
            </Tooltip>
          )}
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'hallazgo',
      headerName: 'Hallazgo',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.row.hallazgo?.titulo || '-',
    },
    {
      field: 'responsable',
      headerName: 'Responsable',
      width: 150,
      valueGetter: (params) =>
        params.row.responsable
          ? `${params.row.responsable.nombre} ${params.row.responsable.apellido}`
          : params.row.responsableTexto || 'Sin asignar',
    },
    {
      field: 'fechaCompromiso',
      headerName: 'Fecha Compromiso',
      width: 140,
      renderCell: (params: GridRenderCellParams<AccionCorrectiva>) => (
        <Typography
          variant="body2"
          color={isVencida(params.row) ? 'error' : 'inherit'}
        >
          {format(new Date(params.value), 'dd/MM/yyyy', { locale: es })}
        </Typography>
      ),
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value} type="estado" />
      ),
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<AccionCorrectiva>) => (
        <Tooltip title="Ver detalle">
          <IconButton
            size="small"
            onClick={() => navigate(`/acciones/${params.row.id}`)}
          >
            <ViewIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Acciones Correctivas"
        subtitle="Seguimiento de acciones correctivas"
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <EstablishmentSelector value={establecimientoId} onChange={(value) => { setEstablecimientoId(value); setPage(0); }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Estado"
                value={estadoFilter}
                onChange={(e) => {
                  setEstadoFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="EN_PROGRESO">En Progreso</MenuItem>
                <MenuItem value="RESUELTA">Resuelta</MenuItem>
                <MenuItem value="VENCIDAS">Vencidas</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <DataGrid
          rows={data?.data || []}
          columns={columns}
          rowCount={data?.total || 0}
          loading={isLoading}
          paginationMode={isClientPaginated ? 'client' : 'server'}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Card>
    </Box>
  );
}
