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
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hallazgosApi } from '../../api/hallazgos';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import type { Hallazgo } from '../../types';

export default function HallazgosPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [nivelRiesgoFilter, setNivelRiesgoFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['hallazgos', page, pageSize, nivelRiesgoFilter],
    queryFn: () =>
      hallazgosApi.getAll({
        page: page + 1,
        limit: pageSize,
        nivelRiesgo: nivelRiesgoFilter || undefined,
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
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value} type="riesgo" />
      ),
    },
    {
      field: 'inspeccion',
      headerName: 'Sector',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.row.inspeccion?.sector || '-',
    },
    {
      field: 'createdAt',
      headerName: 'Fecha',
      width: 130,
      valueFormatter: (params) =>
        format(new Date(params.value), 'dd/MM/yyyy', { locale: es }),
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
              <TextField
                fullWidth
                select
                label="Nivel de Riesgo"
                value={nivelRiesgoFilter}
                onChange={(e) => setNivelRiesgoFilter(e.target.value)}
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
