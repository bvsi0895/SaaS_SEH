import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Assignment as InspeccionIcon,
  Warning as HallazgoIcon,
  Build as AccionIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { dashboardApi } from '../../api/dashboard';
import { reportesApi } from '../../api/reportes';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../contexts/AuthContext';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function KPICard({ title, value, subtitle, icon, color, trend }: KPICardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend >= 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend >= 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}% vs mes anterior
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const filters = establecimientoId ? { establecimientoId } : undefined;
  const { data: establecimientos = [] } = useQuery({
    queryKey: ['reportes', 'establecimientos'],
    queryFn: reportesApi.getEstablecimientos,
  });

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis', establecimientoId],
    queryFn: () => dashboardApi.getKPIs(filters),
  });

  const { data: tendencias, isLoading: tendenciasLoading } = useQuery({
    queryKey: ['dashboard', 'tendencias', establecimientoId],
    queryFn: () => dashboardApi.getTendencias(6, filters),
  });

  const { data: topSectores } = useQuery({
    queryKey: ['dashboard', 'topSectores', establecimientoId],
    queryFn: () => dashboardApi.getTopSectores(5, filters),
  });

  const { data: actividad } = useQuery({
    queryKey: ['dashboard', 'actividad', establecimientoId],
    queryFn: () => dashboardApi.getActividadReciente(10, filters),
  });

  const descargarInforme = async () => {
    setGenerandoInforme(true);
    try {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth(), 1);
      const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const blob = await reportesApi.descargarInformeMensual({
        fechaDesde: desde.toISOString(),
        fechaHasta: hasta.toISOString(),
        ...(establecimientoId ? { establecimientoId } : {}),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `informe-mensual-${desde.toISOString().slice(0, 7)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerandoInforme(false);
    }
  };

  const calcularTrend = () => {
    if (!kpis) return 0;
    if (kpis.inspeccionesMesAnterior === 0) return 100;
    return Math.round(
      ((kpis.inspeccionesEsteMes - kpis.inspeccionesMesAnterior) /
        kpis.inspeccionesMesAnterior) *
        100
    );
  };

  return (
    <Box>
      <PageHeader
        title={`Bienvenido, ${user?.nombre}`}
        subtitle="Resumen de actividad del sistema"
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="dashboard-establecimiento-label">Establecimiento</InputLabel>
            <Select
              labelId="dashboard-establecimiento-label"
              value={establecimientoId}
              label="Establecimiento"
              onChange={(event) => setEstablecimientoId(event.target.value)}
            >
              <MenuItem value="">Todos los autorizados</MenuItem>
              {establecimientos.map((item) => <MenuItem key={item.id} value={item.id}>{item.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={descargarInforme} disabled={generandoInforme}>
            {generandoInforme ? 'Generando…' : 'Descargar informe mensual'}
          </Button>
        </Box>
      </Paper>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <KPICard
              title="Inspecciones este mes"
              value={kpis?.inspeccionesEsteMes || 0}
              icon={<InspeccionIcon />}
              color="#1976d2"
              trend={calcularTrend()}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <KPICard
              title="Hallazgos abiertos"
              value={kpis?.hallazgosAbiertos || 0}
              subtitle={`${kpis?.hallazgosCriticos || 0} criticos`}
              icon={<HallazgoIcon />}
              color="#ed6c02"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <KPICard
              title="Acciones pendientes"
              value={kpis?.accionesPendientes || 0}
              subtitle={`${kpis?.accionesVencidas || 0} vencidas`}
              icon={<AccionIcon />}
              color={kpis?.accionesVencidas ? '#d32f2f' : '#9c27b0'}
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          {kpisLoading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <KPICard
              title="Tasa de cumplimiento"
              value={`${kpis?.tasaCumplimiento || 0}%`}
              icon={<CheckIcon />}
              color="#2e7d32"
            />
          )}
        </Grid>
      </Grid>

      {/* Graficos */}
      <Grid container spacing={3}>
        {/* Tendencias */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Tendencia de Inspecciones y Hallazgos
            </Typography>
            {tendenciasLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tendencias || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="inspecciones"
                    stroke="#1976d2"
                    strokeWidth={2}
                    name="Inspecciones"
                  />
                  <Line
                    type="monotone"
                    dataKey="hallazgos"
                    stroke="#ed6c02"
                    strokeWidth={2}
                    name="Hallazgos"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Top Sectores */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Sectores
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSectores || []}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="sector" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="inspecciones" fill="#1976d2" name="Inspecciones" />
                <Bar dataKey="hallazgos" fill="#ed6c02" name="Hallazgos" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Actividad Reciente */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Actividad Reciente
            </Typography>
            <List>
              {actividad?.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          item.tipo === 'inspeccion'
                            ? '#1976d2'
                            : item.tipo === 'hallazgo'
                            ? '#ed6c02'
                            : '#9c27b0',
                      }}
                    >
                      {item.tipo === 'inspeccion' ? (
                        <InspeccionIcon />
                      ) : item.tipo === 'hallazgo' ? (
                        <HallazgoIcon />
                      ) : (
                        <AccionIcon />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.descripcion}
                    secondary={`${item.usuario} - ${new Date(item.fecha).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
              {(!actividad || actividad.length === 0) && (
                <ListItem>
                  <ListItemText
                    primary="Sin actividad reciente"
                    secondary="Las actividades apareceran aqui"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Acciones Vencidas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Estado General
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'success.light',
                  color: 'success.contrastText',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon />
                  <Typography>Cumplimiento General</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {kpis?.tasaCumplimiento || 0}%
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: kpis?.accionesVencidas ? 'error.light' : 'grey.200',
                  color: kpis?.accionesVencidas ? 'error.contrastText' : 'text.primary',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon />
                  <Typography>Acciones Vencidas</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {kpis?.accionesVencidas || 0}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: kpis?.hallazgosCriticos ? 'error.light' : 'grey.200',
                  color: kpis?.hallazgosCriticos ? 'error.contrastText' : 'text.primary',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HallazgoIcon />
                  <Typography>Hallazgos Criticos</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {kpis?.hallazgosCriticos || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
