import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InspeccionesPage from './pages/inspecciones/InspeccionesPage';
import InspeccionDetailPage from './pages/inspecciones/InspeccionDetailPage';
import NuevaInspeccionPage from './pages/inspecciones/NuevaInspeccionPage';
import ChecklistsPage from './pages/checklists/ChecklistsPage';
import ChecklistDetailPage from './pages/checklists/ChecklistDetailPage';
import HallazgosPage from './pages/hallazgos/HallazgosPage';
import HallazgoDetailPage from './pages/hallazgos/HallazgoDetailPage';
import AccionesPage from './pages/acciones/AccionesPage';
import AccionDetailPage from './pages/acciones/AccionDetailPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import PerfilPage from './pages/perfil/PerfilPage';
import LoadingScreen from './components/common/LoadingScreen';
import AdministracionPage from './pages/administracion/AdministracionPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Rutas privadas */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="inspecciones" element={<InspeccionesPage />} />
        <Route path="inspecciones/nueva" element={<NuevaInspeccionPage />} />
        <Route path="inspecciones/:id" element={<InspeccionDetailPage />} />
        <Route path="checklists" element={<ChecklistsPage />} />
        <Route path="checklists/:id" element={<ChecklistDetailPage />} />
        <Route path="hallazgos" element={<HallazgosPage />} />
        <Route path="hallazgos/:id" element={<HallazgoDetailPage />} />
        <Route path="acciones" element={<AccionesPage />} />
        <Route path="acciones/:id" element={<AccionDetailPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="administracion" element={<AdministracionPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
