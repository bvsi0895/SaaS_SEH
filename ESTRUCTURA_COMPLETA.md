# 📁 Estructura Completa del Proyecto SEH

> Este documento describe la estructura completa del proyecto, con ejemplos de código para cada capa

## 🌳 Árbol de Directorios Completo

```
SEH/
├── package.json (✅ creado - workspace config)
├── README.md (✅ creado)
├── .gitignore
├── .prettierrc
├── .eslintrc.js
│
├── backend/ (API REST con NestJS)
│   ├── package.json (✅ creado)
│   ├── tsconfig.json (✅ creado)
│   ├── nest-cli.json
│   ├── .env.example (✅ creado)
│   ├── .env
│   │
│   ├── prisma/
│   │   ├── schema.prisma (✅ creado - modelo de datos completo)
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── main.ts (✅ creado)
│   │   ├── app.module.ts (✅ creado)
│   │   │
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts (✅ creado)
│   │   │   └── prisma.service.ts (✅ creado)
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.module.ts (✅ creado)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── auth-response.dto.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── decorators/
│   │   │       ├── current-user.decorator.ts
│   │   │       └── roles.decorator.ts
│   │   │
│   │   ├── usuarios/
│   │   │   ├── usuarios.module.ts
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-usuario.dto.ts
│   │   │   │   ├── update-usuario.dto.ts
│   │   │   │   └── usuario-response.dto.ts
│   │   │   └── usuarios.service.spec.ts
│   │   │
│   │   ├── empresas/
│   │   │   ├── empresas.module.ts
│   │   │   ├── empresas.controller.ts
│   │   │   ├── empresas.service.ts
│   │   │   └── dto/
│   │   │       ├── create-empresa.dto.ts
│   │   │       └── update-empresa.dto.ts
│   │   │
│   │   ├── checklists/
│   │   │   ├── checklists.module.ts
│   │   │   ├── checklists.controller.ts
│   │   │   ├── checklists.service.ts
│   │   │   └── dto/
│   │   │       ├── create-checklist.dto.ts
│   │   │       ├── update-checklist.dto.ts
│   │   │       └── create-checklist-item.dto.ts
│   │   │
│   │   ├── inspecciones/
│   │   │   ├── inspecciones.module.ts
│   │   │   ├── inspecciones.controller.ts
│   │   │   ├── inspecciones.service.ts
│   │   │   └── dto/
│   │   │       ├── create-inspeccion.dto.ts
│   │   │       ├── update-inspeccion.dto.ts
│   │   │       └── registrar-item.dto.ts
│   │   │
│   │   ├── hallazgos/
│   │   │   ├── hallazgos.module.ts
│   │   │   ├── hallazgos.controller.ts
│   │   │   ├── hallazgos.service.ts
│   │   │   └── dto/
│   │   │       ├── create-hallazgo.dto.ts
│   │   │       └── update-hallazgo.dto.ts
│   │   │
│   │   ├── acciones-correctivas/
│   │   │   ├── acciones-correctivas.module.ts
│   │   │   ├── acciones-correctivas.controller.ts
│   │   │   ├── acciones-correctivas.service.ts
│   │   │   └── dto/
│   │   │       ├── create-accion-correctiva.dto.ts
│   │   │       ├── update-accion-correctiva.dto.ts
│   │   │       └── cerrar-accion.dto.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts
│   │   │
│   │   ├── reportes/
│   │   │   ├── reportes.module.ts
│   │   │   ├── reportes.controller.ts
│   │   │   ├── reportes.service.ts
│   │   │   └── generators/
│   │   │       └── pdf-inspeccion.generator.ts
│   │   │
│   │   ├── common/
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── logging.interceptor.ts
│   │   │   └── pipes/
│   │   │       └── parse-objectid.pipe.ts
│   │   │
│   │   └── utils/
│   │       ├── file-upload.util.ts
│   │       ├── date.util.ts
│   │       └── password.util.ts
│   │
│   ├── test/
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── uploads/ (generado en runtime)
│   └── README.md
│
├── web/ (PWA con React + Vite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .env.example
│   │
│   ├── public/
│   │   ├── manifest.json
│   │   ├── service-worker.js
│   │   ├── icons/
│   │   │   ├── icon-72x72.png
│   │   │   ├── icon-96x96.png
│   │   │   ├── icon-128x128.png
│   │   │   ├── icon-144x144.png
│   │   │   ├── icon-152x152.png
│   │   │   ├── icon-192x192.png
│   │   │   ├── icon-384x384.png
│   │   │   └── icon-512x512.png
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   │
│   │   │   ├── forms/
│   │   │   │   ├── FormInput.tsx
│   │   │   │   ├── FormSelect.tsx
│   │   │   │   ├── FormTextarea.tsx
│   │   │   │   └── ImageUpload.tsx
│   │   │   │
│   │   │   └── charts/
│   │   │       ├── BarChart.tsx
│   │   │       └── PieChart.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   │
│   │   │   ├── checklists/
│   │   │   │   ├── ChecklistsPage.tsx
│   │   │   │   ├── ChecklistFormPage.tsx
│   │   │   │   └── ChecklistDetailPage.tsx
│   │   │   │
│   │   │   ├── inspecciones/
│   │   │   │   ├── InspeccionesPage.tsx
│   │   │   │   ├── NuevaInspeccionPage.tsx
│   │   │   │   ├── RealizarInspeccionPage.tsx
│   │   │   │   └── InspeccionDetailPage.tsx
│   │   │   │
│   │   │   ├── hallazgos/
│   │   │   │   ├── HallazgosPage.tsx
│   │   │   │   └── HallazgoDetailPage.tsx
│   │   │   │
│   │   │   ├── acciones-correctivas/
│   │   │   │   ├── AccionesCorrectivasPage.tsx
│   │   │   │   └── AccionCorrectivaDetailPage.tsx
│   │   │   │
│   │   │   └── perfil/
│   │   │       └── PerfilPage.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── checklists.service.ts
│   │   │   ├── inspecciones.service.ts
│   │   │   ├── hallazgos.service.ts
│   │   │   └── acciones-correctivas.service.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChecklists.ts
│   │   │   ├── useInspecciones.ts
│   │   │   └── useLocalStorage.ts
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   │
│   │   ├── types/
│   │   │   ├── usuario.types.ts
│   │   │   ├── checklist.types.ts
│   │   │   ├── inspeccion.types.ts
│   │   │   └── hallazgo.types.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── date.utils.ts
│   │   │   ├── format.utils.ts
│   │   │   └── validation.utils.ts
│   │   │
│   │   └── styles/
│   │       ├── theme.ts
│   │       ├── global.css
│   │       └── variables.css
│   │
│   ├── tests/
│   │   ├── setup.ts
│   │   └── components/
│   │       └── Button.test.tsx
│   │
│   └── README.md
│
├── mobile/ (App React Native + Expo)
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   ├── App.tsx
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── .env.example
│   │
│   ├── assets/
│   │   ├── icon.png
│   │   ├── splash.png
│   │   └── adaptive-icon.png
│   │
│   ├── src/
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── RegisterScreen.tsx
│   │   │   │
│   │   │   ├── home/
│   │   │   │   └── HomeScreen.tsx
│   │   │   │
│   │   │   ├── inspecciones/
│   │   │   │   ├── InspeccionesListScreen.tsx
│   │   │   │   ├── NuevaInspeccionScreen.tsx
│   │   │   │   ├── RealizarInspeccionScreen.tsx
│   │   │   │   └── InspeccionDetailScreen.tsx
│   │   │   │
│   │   │   ├── hallazgos/
│   │   │   │   ├── RegistrarHallazgoScreen.tsx
│   │   │   │   └── HallazgosListScreen.tsx
│   │   │   │
│   │   │   ├── acciones/
│   │   │   │   └── AccionesListScreen.tsx
│   │   │   │
│   │   │   └── perfil/
│   │   │       └── PerfilScreen.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── CameraCapture.tsx
│   │   │   │
│   │   │   └── lists/
│   │   │       ├── InspeccionCard.tsx
│   │   │       ├── HallazgoCard.tsx
│   │   │       └── AccionCard.tsx
│   │   │
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── MainNavigator.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── camera.service.ts
│   │   │   └── location.service.ts
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── OfflineContext.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useCamera.ts
│   │   │   ├── useLocation.ts
│   │   │   └── useOfflineSync.ts
│   │   │
│   │   ├── types/
│   │   │   └── (mismos que web)
│   │   │
│   │   ├── utils/
│   │   │   ├── date.utils.ts
│   │   │   └── sync.utils.ts
│   │   │
│   │   └── theme/
│   │       ├── colors.ts
│   │       ├── fonts.ts
│   │       └── spacing.ts
│   │
│   └── README.md
│
└── docs/
    ├── MANUAL_IMPLEMENTACION.md
    ├── MANUAL_USUARIO_TECNICO.md
    ├── MANUAL_USUARIO_ADMIN.md
    ├── ARQUITECTURA_TECNICA.md
    ├── API_ENDPOINTS.md
    └── assets/
        ├── diagrams/
        │   ├── arquitectura.png
        │   ├── modelo-datos.png
        │   └── flujo-inspeccion.png
        └── screenshots/
            └── (capturas de pantalla)
```

## 📋 Archivos Faltantes por Crear

### Backend - Archivos Críticos Pendientes

Para completar el backend, debes crear estos archivos siguiendo los patrones establecidos:

#### 1. Auth Module (src/auth/)
```typescript
// auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('register') // Registro de usuarios
  @Post('login')    // Login
  @Get('me')        // Obtener usuario actual
  @Post('refresh')  // Refresh token
}

// auth.service.ts
export class AuthService {
  async register(dto: RegisterDto)
  async login(dto: LoginDto)
  async validateUser(email, password)
  async generateTokens(user)
}

// strategies/jwt.strategy.ts
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload)
}
```

#### 2. Usuarios Module (src/usuarios/)
```typescript
// usuarios.controller.ts
@Controller('usuarios')
export class UsuariosController {
  @Get()           // Listar usuarios
  @Get(':id')      // Obtener usuario
  @Put(':id')      // Actualizar usuario
  @Delete(':id')   // Eliminar usuario
}

// usuarios.service.ts
export class UsuariosService {
  async findAll(empresaId: string, filters)
  async findOne(id: string)
  async update(id: string, dto: UpdateUsuarioDto)
  async remove(id: string)
}
```

#### 3. Inspecciones Module (src/inspecciones/)
```typescript
// inspecciones.controller.ts
@Controller('inspecciones')
export class InspeccionesController {
  @Post()                    // Crear inspección
  @Get()                     // Listar inspecciones
  @Get(':id')                // Detalle inspección
  @Put(':id/item')           // Registrar item checklist
  @Post(':id/finalizar')     // Finalizar inspección
  @Get(':id/pdf')            // Generar PDF
}

// inspecciones.service.ts
export class InspeccionesService {
  async create(dto: CreateInspeccionDto, usuarioId)
  async findAll(empresaId, filters)
  async findOne(id: string)
  async registrarItem(id, itemDto)
  async finalizar(id: string)
}
```

#### 4. Dashboard Module (src/dashboard/)
```typescript
// dashboard.service.ts
export class DashboardService {
  async getResumen(empresaId: string, filtros) {
    return {
      totalInspecciones,
      hallazgosPorNivel,
      accionesPorEstado,
      inspeccionesPorPeriodo,
      topSectores,
      tendencias
    };
  }
}
```

#### 5. Reportes Module (src/reportes/)
```typescript
// generators/pdf-inspeccion.generator.ts
export class PDFInspeccionGenerator {
  async generate(inspeccionId: string): Promise<Buffer> {
    // Usar PDFKit para generar PDF profesional
    const doc = new PDFDocument();
    // Agregar logo empresa
    // Agregar datos inspección
    // Agregar checklist
    // Agregar hallazgos con fotos
    return pdfBuffer;
  }
}
```

### Web - Archivos Críticos Pendientes

#### package.json
```json
{
  "name": "seh-web",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mui/material": "^5.15.0",
    "@tanstack/react-query": "^5.17.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.5",
    "recharts": "^2.10.3"
  }
}
```

#### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SEH - Seguridad e Higiene',
        short_name: 'SEH',
        description: 'Sistema de inspecciones de seguridad',
        theme_color: '#1976d2',
        icons: [/* ... */]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [/* ... */]
      }
    })
  ]
});
```

#### Ejemplo de Página Principal (pages/inspecciones/InspeccionesPage.tsx)
```typescript
export const InspeccionesPage = () => {
  const { data: inspecciones, isLoading } = useInspecciones();

  return (
    <AppLayout>
      <Box>
        <Typography variant="h4">Inspecciones</Typography>
        <Button onClick={() => navigate('/inspecciones/nueva')}>
          Nueva Inspección
        </Button>
        <DataTable
          data={inspecciones}
          columns={columns}
          onRowClick={(row) => navigate(`/inspecciones/${row.id}`)}
        />
      </Box>
    </AppLayout>
  );
};
```

### Mobile - Archivos Críticos Pendientes

#### package.json
```json
{
  "name": "seh-mobile",
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-location": "~16.5.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "axios": "^1.6.5",
    "@react-native-async-storage/async-storage": "1.21.0"
  }
}
```

#### app.json
```json
{
  "expo": {
    "name": "SEH Mobile",
    "slug": "seh-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1976d2"
    },
    "android": {
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"],
      "package": "com.seh.mobile"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.seh.mobile"
    }
  }
}
```

## 🔄 Próximos Pasos para Completar

1. **Backend**: Crear todos los controllers, services y DTOs siguiendo los ejemplos
2. **Web**: Implementar todas las páginas y componentes UI
3. **Mobile**: Desarrollar todas las screens con navegación
4. **Tests**: Agregar tests unitarios y E2E
5. **Docs**: Completar toda la documentación

---

**Nota**: Este documento sirve como mapa completo del proyecto. Cada archivo debe crearse siguiendo los patrones establecidos en los ejemplos ya creados.
