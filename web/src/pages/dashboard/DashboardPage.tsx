import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Skeleton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
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
import { queryKeys } from '../../queryKeys';
import { reportesApi } from '../../api/reportes';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import EstablishmentSelector from '../../components/common/EstablishmentSelector';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number | null;
}

function KPICard({ title, value, subtitle, icon, color, trend }: KPICardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
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
            {trend !== undefined && trend !== null && (
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

function QueryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Reintentar
        </Button>
      }
    >
      {message}
    </Alert>
  );
}

export default function DashboardPage() {
  const { user, activeContextId } = useAuth();
  const { showError } = useSnackbar();
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const filters = establecimientoId ? { establecimientoId } : undefined;
  const dashboardScope = { contextId: activeContextId, userId: user?.id, role: user?.rol };
  const kpisQuery = useQuery({
    queryKey: [...queryKeys.dashboard(dashboardScope), 'kpis', establecimientoId],
    queryFn: () => dashboardApi.getKPIs(filters),
  });
  const tendenciasQuery = useQuery({
    queryKey: [...queryKeys.dashboard(dashboardScope), 'tendencias', establecimientoId],
    queryFn: () => dashboardApi.getTendencias('mes', filters),
  });
  const topSectoresQuery = useQuery({
    queryKey: [...queryKeys.dashboard(dashboardScope), 'topSectores', establecimientoId],
    queryFn: () => dashboardApi.getTopSectores(5, filters),
  });
  const actividadQuery = useQuery({
    queryKey: [...queryKeys.dashboard(dashboardScope), 'actividad', establecimientoId],
    queryFn: () => dashboardApi.getActividadReciente(10, filters),
  });
  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: retryKpis,
  } = kpisQuery;
  const {
    data: tendencias,
    isLoading: tendenciasLoading,
    isError: tendenciasError,
    refetch: retryTendencias,
  } = tendenciasQuery;
  const {
    data: topSectores,
    isLoading: topLoading,
    isError: topError,
    refetch: retryTop,
  } = topSectoresQuery;
  const {
    data: actividad,
    isLoading: actividadLoading,
    isError: actividadError,
    refetch: retryActividad,
  } = actividadQuery;

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
    } catch {
      showError('No se pudo generar el informe mensual. Intente nuevamente.');
    } finally {
      setGenerandoInforme(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={`Bienvenido, ${user?.nombre}`}
        subtitle="Resumen de actividad del sistema"
      />
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <EstablishmentSelector value={establecimientoId} onChange={setEstablecimientoId} />
          {user?.rol !== 'TECNICO' && (
            <Button
              variant="contained"
              onClick={descargarInforme}
              disabled={generandoInforme}
            >
              {generandoInforme ? 'Generando…' : 'Descargar informe mensual'}
            </Button>
          )}
        </Box>
      </Paper>

      {kpisError ? (
        <QueryError
          message="No se pudieron cargar los indicadores."
          onRetry={() => retryKpis()}
        />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              kpis && (
                <KPICard
                  title="Inspecciones iniciadas este mes"
                  value={kpis.inspeccionesEsteMes}
                  subtitle={`${kpis.inspeccionesCompletadasEsteMes} completadas`}
                  icon={<InspeccionIcon />}
                  color="#1976d2"
                  trend={kpis.variacionMensual}
                />
              )
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              kpis && (
                <KPICard
                  title="Hallazgos abiertos"
                  value={kpis.hallazgosAbiertos}
                  subtitle={`${kpis.hallazgosTotal} total · ${kpis.hallazgosCriticos} críticos · ${kpis.hallazgosAltos} altos`}
                  icon={<HallazgoIcon />}
                  color="#ed6c02"
                />
              )
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? <Skeleton variant="rectangular" height={140} /> : kpis && (
              <KPICard
                title="Hallazgos en corrección"
                value={kpis.hallazgosEnCorreccion}
                subtitle="Intervención pendiente de verificación"
                icon={<AccionIcon />}
                color="#1976d2"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? <Skeleton variant="rectangular" height={140} /> : kpis && (
              <KPICard
                title="Hallazgos solucionados"
                value={kpis.hallazgosSolucionados}
                subtitle="Corrección verificada"
                icon={<CheckIcon />}
                color="#2e7d32"
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              kpis && (
                <KPICard
                  title="Acciones pendientes"
                  value={kpis.accionesPendientes}
                  subtitle={`${kpis.accionesEnProgreso} en progreso · ${kpis.accionesVencidas} vencidas`}
                  icon={<AccionIcon />}
                  color={kpis.accionesVencidas > 0 ? '#d32f2f' : '#9c27b0'}
                />
              )
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            {kpisLoading ? (
              <Skeleton variant="rectangular" height={140} />
            ) : (
              kpis && (
                <KPICard
                  title="Tasa de cumplimiento"
                  value={
                    kpis.tasaCumplimiento === null
                      ? '—'
                      : `${kpis.tasaCumplimiento}%`
                  }
                  subtitle="Ítems evaluables"
                  icon={<CheckIcon />}
                  color="#2e7d32"
                />
              )
            )}
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Tendencia de Inspecciones y Hallazgos
            </Typography>
            {tendenciasError ? (
              <QueryError
                message="No se pudieron cargar las tendencias."
                onRetry={() => retryTendencias()}
              />
            ) : tendenciasLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : tendencias && tendencias.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tendencias}>
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
            ) : (
              <Typography color="text.secondary">
                Sin datos para el período seleccionado.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Top Sectores
            </Typography>
            {topError ? (
              <QueryError
                message="No se pudo cargar el top de sectores."
                onRetry={() => retryTop()}
              />
            ) : topLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : topSectores && topSectores.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topSectores}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="sector" type="category" width={100} />
                  <Tooltip />
                  <Bar
                    dataKey="inspecciones"
                    fill="#1976d2"
                    name="Inspecciones"
                  />
                  <Bar dataKey="hallazgos" fill="#ed6c02" name="Hallazgos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">
                Sin sectores con hallazgos.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Actividad Reciente
            </Typography>
            {actividadError ? (
              <QueryError
                message="No se pudo cargar la actividad reciente."
                onRetry={() => retryActividad()}
              />
            ) : actividadLoading ? (
              <Skeleton variant="rectangular" height={250} />
            ) : (
              <List>
                {actividad && actividad.length > 0 ? (
                  actividad.map((item) => (
                    <ListItem key={`${item.tipo}-${item.id}`} divider>
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
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="Sin actividad reciente"
                      secondary="Las actividades aparecerán aquí"
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Estado General
            </Typography>
            {kpisError ? (
              <Typography color="text.secondary">
                Los indicadores no están disponibles.
              </Typography>
            ) : kpisLoading ? (
              <Skeleton variant="rectangular" height={250} />
            ) : (
              kpis && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    mt: 2,
                  }}
                >
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
                      {kpis.tasaCumplimiento === null
                        ? '—'
                        : `${kpis.tasaCumplimiento}%`}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor:
                        kpis.accionesVencidas > 0 ? 'error.light' : 'grey.200',
                      color:
                        kpis.accionesVencidas > 0
                          ? 'error.contrastText'
                          : 'text.primary',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorIcon />
                      <Typography>Acciones Vencidas</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight="bold">
                      {kpis.accionesVencidas}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor:
                        kpis.hallazgosCriticos > 0 ? 'error.light' : 'grey.200',
                      color:
                        kpis.hallazgosCriticos > 0
                          ? 'error.contrastText'
                          : 'text.primary',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HallazgoIcon />
                      <Typography>Hallazgos Críticos</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight="bold">
                      {kpis.hallazgosCriticos}
                    </Typography>
                  </Box>
                </Box>
              )
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
