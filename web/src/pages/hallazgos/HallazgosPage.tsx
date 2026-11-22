import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hallazgosApi } from '../../api/hallazgos';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import type { Hallazgo } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import EstablishmentSelector from '../../components/common/EstablishmentSelector';
import { getQueryScope, queryKeys } from '../../queryKeys';

const getPhotoCount = (fotosUrls?: string) => {
  if (!fotosUrls) return 0;
  try {
    const parsed = JSON.parse(fotosUrls);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export default function HallazgosPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [nivelRiesgoFilter, setNivelRiesgoFilter] = useState<string>('');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const { user, activeContextId } = useAuth();
  const queryScope = getQueryScope(activeContextId, user?.id, user?.rol);

  const customHeaderSx = {
    display: 'block',
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.15,
    textAlign: 'center',
    whiteSpace: 'normal',
  } as const;

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.findings(queryScope), page, pageSize, nivelRiesgoFilter, estadoFilter, establecimientoId],
    queryFn: () =>
      hallazgosApi.getAll({
        page: page + 1,
        limit: pageSize,
        nivelRiesgo: nivelRiesgoFilter || undefined,
        estado: estadoFilter || undefined,
        establecimientoId: establecimientoId || undefined,
      }),
  });

  const columns: GridColDef[] = [
    {
      field: 'titulo',
      headerName: 'Titulo',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'ubicacionTexto',
      headerName: 'Ubicacion',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'nivelRiesgo',
      headerName: 'Nivel de Riesgo',
      width: 118,
      headerAlign: 'center',
      renderHeader: () => <Box component="span" sx={customHeaderSx}>Nivel de<br />Riesgo</Box>,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value} type="riesgo" />
      ),
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 130,
      renderCell: (params: GridRenderCellParams) => <StatusChip status={params.value} type="hallazgo" />,
    },
    {
      field: 'inspeccion',
      headerName: 'Sector',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.row.inspeccion?.sector || '-',
    },
    {
      field: 'tecnicoInspector',
      headerName: 'Técnico inspector',
      width: 155,
      headerAlign: 'center',
      renderHeader: () => <Box component="span" sx={customHeaderSx}>Técnico<br />inspector</Box>,
      valueGetter: (params) => {
        const usuario = params.row.inspeccion?.usuario;
        return usuario ? `${usuario.nombre} ${usuario.apellido}` : '-';
      },
    },
    {
      field: 'responsablesAcciones',
      headerName: 'Responsables de acciones',
      width: 175,
      headerAlign: 'center',
      renderHeader: () => <Box component="span" sx={customHeaderSx}>Responsables<br />de acciones</Box>,
      valueGetter: (params) => {
        const responsables = (params.row.accionesCorrectivas || [])
          .map((accion: any) => accion.responsable)
          .filter(Boolean)
          .map((responsable: any) => `${responsable.nombre} ${responsable.apellido}`);
        return responsables.length > 0 ? Array.from(new Set(responsables)).join(', ') : 'Sin asignar';
      },
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 130,
      valueFormatter: (params) =>
        format(new Date(params.value), 'dd/MM/yyyy', { locale: es }),
    },
    {
      field: 'evidencias',
      headerName: 'Evidencias',
      width: 110,
      sortable: false,
      valueGetter: (params) => getPhotoCount(params.row.fotosUrls),
      renderCell: (params: GridRenderCellParams<Hallazgo>) => (
        <Button
          size="small"
          onClick={() => navigate(`/hallazgos/${params.row.id}`)}
          aria-label={`Ver ${getPhotoCount(params.row.fotosUrls)} evidencias`}
        >
          {getPhotoCount(params.row.fotosUrls)} foto{getPhotoCount(params.row.fotosUrls) === 1 ? '' : 's'}
        </Button>
      ),
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Hallazgo>) => (
        <Tooltip title="Ver detalle">
          <IconButton
            size="small"
            onClick={() => navigate(`/hallazgos/${params.row.id}`)}
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
        title="Hallazgos"
        subtitle="Listado de todos los hallazgos detectados"
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
                onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="EN_CORRECCION">En corrección</MenuItem>
                <MenuItem value="SOLUCIONADO">Solucionado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Nivel de Riesgo"
                value={nivelRiesgoFilter}
                onChange={(e) => {
                  setNivelRiesgoFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="BAJO">Bajo</MenuItem>
                <MenuItem value="MEDIO">Medio</MenuItem>
                <MenuItem value="ALTO">Alto</MenuItem>
                <MenuItem value="CRITICO">Critico</MenuItem>
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
          paginationMode={data && !data.isPaginated ? 'client' : 'server'}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          columnHeaderHeight={58}
          sx={{
            minWidth: 980,
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              alignItems: 'center',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              whiteSpace: 'normal',
              lineHeight: 1.15,
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
              textAlign: 'center',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Card>
    </Box>
  );
}
