import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { inspeccionesApi } from '../../api/inspecciones';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import type { Inspeccion } from '../../types';

export default function InspeccionesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['inspecciones', page, pageSize, estadoFilter],
    queryFn: () =>
      inspeccionesApi.getAll({
        page: page + 1,
        limit: pageSize,
        estado: estadoFilter || undefined,
      }),
  });

  const handleDownloadPDF = async (id: string) => {
    try {
      const blob = await inspeccionesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspeccion-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'sector',
      headerName: 'Sector',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'checklist',
      headerName: 'Checklist',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.row.checklist?.nombre || '-',
    },
    {
      field: 'usuario',
      headerName: 'Tecnico',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) =>
        params.row.usuario
          ? `${params.row.usuario.nombre} ${params.row.usuario.apellido}`
          : '-',
    },
    {
      field: 'fechaHoraInicio',
      headerName: 'Fecha',
      width: 150,
      valueFormatter: (params) =>
        format(new Date(params.value), 'dd/MM/yyyy HH:mm', { locale: es }),
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
      field: 'hallazgos',
      headerName: 'Hallazgos',
      width: 100,
      align: 'center',
      valueGetter: (params) => params.row._count?.hallazgos || 0,
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Inspeccion>) => (
        <Box>
          <Tooltip title="Ver detalle">
            <IconButton
              size="small"
              onClick={() => navigate(`/inspecciones/${params.row.id}`)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          {params.row.estado === 'COMPLETADA' && (
            <Tooltip title="Descargar PDF">
              <IconButton
                size="small"
                onClick={() => handleDownloadPDF(params.row.id)}
              >
                <PdfIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Inspecciones"
        subtitle="Listado de todas las inspecciones realizadas"
        action={{
          label: 'Nueva Inspeccion',
          onClick: () => navigate('/inspecciones/nueva'),
          icon: 'add',
        }}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Estado"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="EN_PROGRESO">En Progreso</MenuItem>
                <MenuItem value="COMPLETADA">Completada</MenuItem>
                <MenuItem value="CANCELADA">Cancelada</MenuItem>
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
          paginationMode="server"
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
