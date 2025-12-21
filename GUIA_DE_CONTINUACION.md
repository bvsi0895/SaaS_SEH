# 🚀 Guía de Continuación del Proyecto SEH

> Instrucciones para desarrolladores que desean completar la implementación completa del sistema

## 📊 Estado Actual del Proyecto

### ✅ Lo que está COMPLETO

1. **Estructura completa del monorepo**
   - Carpetas backend, web, mobile, docs
   - package.json configurado con workspaces
   - tsconfig.json en todos los proyectos

2. **Backend - Fundamentos**
   - ✅ Schema de Prisma completo con todos los modelos
   - ✅ Configuración de NestJS
   - ✅ Módulos principales estructurados (Auth, Prisma)
   - ✅ Variables de entorno configuradas
   - ✅ Swagger/OpenAPI setup

3. **Documentación Completa**
   - ✅ Manual de Implementación
   - ✅ Manual del Usuario Técnico
   - ✅ Manual del Administrador
   - ✅ Arquitectura Técnica detallada
   - ✅ README principal del proyecto

4. **Guías y Referencias**
   - ✅ ESTRUCTURA_COMPLETA.md con árbol de archivos
   - ✅ Patrones y ejemplos de código
   - ✅ Diagramas de arquitectura

### 🔨 Lo que FALTA Implementar

Para tener un sistema 100% funcional, necesitas completar:

---

## 📝 Checklist de Implementación

### FASE 1: Backend Completo (Estimado: 2-3 semanas)

#### Módulo de Autenticación

```typescript
// backend/src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // Implementar: validar email único, hashear password, crear usuario
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    // Implementar: validar credenciales, generar JWT
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user) {
    // Implementar: retornar datos del usuario actual
  }
}

// backend/src/auth/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsUUID()
  empresaId: string;
}
```

**Archivos a crear:**
- [ ] `auth/dto/login.dto.ts`
- [ ] `auth/dto/register.dto.ts`
- [ ] `auth/dto/auth-response.dto.ts`
- [ ] `auth/strategies/jwt.strategy.ts`
- [ ] `auth/strategies/local.strategy.ts`
- [ ] `auth/guards/jwt-auth.guard.ts`
- [ ] `auth/guards/roles.guard.ts`
- [ ] `auth/decorators/current-user.decorator.ts`
- [ ] `auth/decorators/roles.decorator.ts`
- [ ] `auth/auth.service.ts` (completo)
- [ ] `auth/auth.controller.ts` (completo)

#### Módulo de Usuarios

```typescript
// backend/src/usuarios/usuarios.service.ts
@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: { id: true, email: true, nombre: true, apellido: true, rol: true }
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: dto,
    });
  }
}
```

**Archivos a crear:**
- [ ] `usuarios/usuarios.module.ts`
- [ ] `usuarios/usuarios.controller.ts`
- [ ] `usuarios/usuarios.service.ts`
- [ ] `usuarios/dto/create-usuario.dto.ts`
- [ ] `usuarios/dto/update-usuario.dto.ts`
- [ ] `usuarios/usuarios.service.spec.ts` (tests)

#### Módulo de Checklists

**Archivos a crear:**
- [ ] `checklists/checklists.module.ts`
- [ ] `checklists/checklists.controller.ts`
- [ ] `checklists/checklists.service.ts`
- [ ] `checklists/dto/create-checklist.dto.ts`
- [ ] `checklists/dto/update-checklist.dto.ts`
- [ ] `checklists/dto/create-checklist-item.dto.ts`

#### Módulo de Inspecciones (CRÍTICO)

```typescript
// backend/src/inspecciones/inspecciones.service.ts
@Injectable()
export class InspeccionesService {
  async create(dto: CreateInspeccionDto, usuarioId: string) {
    // 1. Validar que el checklist existe
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: dto.checklistId },
      include: { items: true }
    });

    // 2. Crear inspección
    const inspeccion = await this.prisma.inspeccion.create({
      data: {
        checklistId: dto.checklistId,
        usuarioId,
        empresaId: dto.empresaId,
        sector: dto.sector,
        estado: EstadoInspeccion.EN_PROGRESO,
        // ... más campos
      }
    });

    // 3. Crear InspeccionItems vacíos para cada ChecklistItem
    await this.prisma.inspeccionItem.createMany({
      data: checklist.items.map(item => ({
        inspeccionId: inspeccion.id,
        checklistItemId: item.id,
        cumplimiento: CumplimientoItem.CUMPLE, // Por defecto
      }))
    });

    return inspeccion;
  }

  async registrarItem(inspeccionId: string, dto: RegistrarItemDto) {
    return this.prisma.inspeccionItem.update({
      where: {
        id: dto.inspeccionItemId
      },
      data: {
        cumplimiento: dto.cumplimiento,
        observacion: dto.observacion,
      }
    });
  }

  async finalizar(id: string) {
    return this.prisma.inspeccion.update({
      where: { id },
      data: {
        estado: EstadoInspeccion.COMPLETADA,
        fechaHoraFin: new Date(),
      }
    });
  }
}
```

**Archivos a crear:**
- [ ] `inspecciones/inspecciones.module.ts`
- [ ] `inspecciones/inspecciones.controller.ts`
- [ ] `inspecciones/inspecciones.service.ts`
- [ ] `inspecciones/dto/create-inspeccion.dto.ts`
- [ ] `inspecciones/dto/registrar-item.dto.ts`

#### Módulo de Hallazgos

**Archivos a crear:**
- [ ] `hallazgos/hallazgos.module.ts`
- [ ] `hallazgos/hallazgos.controller.ts`
- [ ] `hallazgos/hallazgos.service.ts`
- [ ] `hallazgos/dto/create-hallazgo.dto.ts`

#### Módulo de Acciones Correctivas

**Archivos a crear:**
- [ ] `acciones-correctivas/acciones-correctivas.module.ts`
- [ ] `acciones-correctivas/acciones-correctivas.controller.ts`
- [ ] `acciones-correctivas/acciones-correctivas.service.ts`
- [ ] `acciones-correctivas/dto/create-accion-correctiva.dto.ts`
- [ ] `acciones-correctivas/dto/cerrar-accion.dto.ts`

#### Módulo de Dashboard

```typescript
// backend/src/dashboard/dashboard.service.ts
@Injectable()
export class DashboardService {
  async getResumen(empresaId: string, filtros: FiltrosDashboardDto) {
    const { fechaInicio, fechaFin } = filtros;

    // Contar inspecciones
    const totalInspecciones = await this.prisma.inspeccion.count({
      where: {
        empresaId,
        fechaHoraInicio: { gte: fechaInicio, lte: fechaFin }
      }
    });

    // Contar hallazgos por nivel
    const hallazgosPorNivel = await this.prisma.hallazgo.groupBy({
      by: ['nivelRiesgo'],
      _count: true,
      where: {
        inspeccion: {
          empresaId,
          fechaHoraInicio: { gte: fechaInicio, lte: fechaFin }
        }
      }
    });

    // Acciones por estado
    const accionesPorEstado = await this.prisma.accionCorrectiva.groupBy({
      by: ['estado'],
      _count: true,
      where: { empresaId }
    });

    return {
      totalInspecciones,
      hallazgosPorNivel,
      accionesPorEstado,
      // ... más métricas
    };
  }
}
```

**Archivos a crear:**
- [ ] `dashboard/dashboard.module.ts`
- [ ] `dashboard/dashboard.controller.ts`
- [ ] `dashboard/dashboard.service.ts`

#### Módulo de Reportes (Generación PDF)

```typescript
// backend/src/reportes/generators/pdf-inspeccion.generator.ts
import PDFDocument from 'pdfkit';

export class PDFInspeccionGenerator {
  async generate(inspeccionId: string): Promise<Buffer> {
    // Buscar inspección completa
    const inspeccion = await this.prisma.inspeccion.findUnique({
      where: { id: inspeccionId },
      include: {
        empresa: true,
        usuario: true,
        checklist: { include: { items: true } },
        items: { include: { checklistItem: true } },
        hallazgos: { include: { accionesCorrectivas: true } }
      }
    });

    // Crear PDF
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Header con logo
    if (inspeccion.empresa.logoUrl) {
      doc.image(inspeccion.empresa.logoUrl, 50, 50, { width: 100 });
    }
    doc.fontSize(20).text('Reporte de Inspección', 200, 60);

    // Datos generales
    doc.fontSize(12);
    doc.text(`Técnico: ${inspeccion.usuario.nombre} ${inspeccion.usuario.apellido}`);
    doc.text(`Sector: ${inspeccion.sector}`);
    doc.text(`Fecha: ${inspeccion.fechaHoraInicio.toLocaleDateString()}`);

    // Checklist
    doc.fontSize(16).text('Resultados del Checklist', { underline: true });
    inspeccion.items.forEach((item) => {
      const icon = item.cumplimiento === 'CUMPLE' ? '✓' : '✗';
      doc.fontSize(10).text(`${icon} ${item.checklistItem.descripcion}`);
    });

    // Hallazgos
    if (inspeccion.hallazgos.length > 0) {
      doc.addPage();
      doc.fontSize(16).text('Hallazgos Detectados', { underline: true });

      inspeccion.hallazgos.forEach((hallazgo) => {
        doc.fontSize(14).text(hallazgo.titulo, { bold: true });
        doc.fontSize(10).text(hallazgo.descripcion);
        doc.text(`Nivel de Riesgo: ${hallazgo.nivelRiesgo}`);

        // Agregar fotos si existen
        if (hallazgo.fotosUrls) {
          // Parsear JSON y agregar imágenes
        }
      });
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }
}
```

**Archivos a crear:**
- [ ] `reportes/reportes.module.ts`
- [ ] `reportes/reportes.controller.ts`
- [ ] `reportes/reportes.service.ts`
- [ ] `reportes/generators/pdf-inspeccion.generator.ts`

#### Utilidades y Middlewares

**Archivos a crear:**
- [ ] `common/filters/http-exception.filter.ts`
- [ ] `common/interceptors/logging.interceptor.ts`
- [ ] `utils/file-upload.util.ts`
- [ ] `utils/password.util.ts`

#### Seed de Base de Datos

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear empresa de ejemplo
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Empresa Demo SEH',
      cuit: '20-12345678-9',
    }
  });

  // Crear usuarios
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.usuario.create({
    data: {
      email: 'admin@ejemplo.com',
      password: adminPassword,
      nombre: 'Admin',
      apellido: 'Sistema',
      rol: 'ADMIN_EMPRESA',
      empresaId: empresa.id,
    }
  });

  // Crear checklist de ejemplo
  const checklist = await prisma.checklist.create({
    data: {
      nombre: 'Orden y Limpieza',
      tipo: 'ORDEN_LIMPIEZA',
      empresaId: empresa.id,
      items: {
        create: [
          { descripcion: 'Pisos limpios y secos', orden: 1 },
          { descripcion: 'Pasillos libres de obstáculos', orden: 2 },
          // ... más items
        ]
      }
    }
  });

  console.log('✅ Seed completado');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

**Archivo a crear:**
- [ ] `prisma/seed.ts`

---

### FASE 2: Frontend Web (Estimado: 2-3 semanas)

#### Configuración Base

```json
// web/package.json
{
  "name": "seh-web",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.5",
    "recharts": "^2.10.3",
    "date-fns": "^3.0.0"
  }
}
```

**Archivos a crear:**
- [ ] `web/package.json`
- [ ] `web/tsconfig.json`
- [ ] `web/vite.config.ts`
- [ ] `web/index.html`
- [ ] `web/.env.example`

#### Configuración de Vite con PWA

```typescript
// web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'SEH - Seguridad e Higiene',
        short_name: 'SEH',
        description: 'Sistema de inspecciones de seguridad',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.seh\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

#### Servicios y API Client

```typescript
// web/src/services/api.service.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// Interceptor para agregar JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect a login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Archivos a crear:**
- [ ] `web/src/services/api.service.ts`
- [ ] `web/src/services/auth.service.ts`
- [ ] `web/src/services/checklists.service.ts`
- [ ] `web/src/services/inspecciones.service.ts`

#### Páginas Principales

**Archivos a crear:**
- [ ] `web/src/pages/auth/LoginPage.tsx`
- [ ] `web/src/pages/dashboard/DashboardPage.tsx`
- [ ] `web/src/pages/checklists/ChecklistsPage.tsx`
- [ ] `web/src/pages/inspecciones/InspeccionesPage.tsx`
- [ ] `web/src/pages/inspecciones/NuevaInspeccionPage.tsx`
- [ ] `web/src/pages/inspecciones/RealizarInspeccionPage.tsx`

#### Componentes Reutilizables

**Archivos a crear:**
- [ ] `web/src/components/layout/AppLayout.tsx`
- [ ] `web/src/components/common/Button.tsx`
- [ ] `web/src/components/common/DataTable.tsx`
- [ ] `web/src/components/forms/FormInput.tsx`

---

### FASE 3: App Móvil (Estimado: 2 semanas)

```json
// mobile/package.json
{
  "name": "seh-mobile",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-location": "~16.5.0",
    "@react-navigation/native": "^6.1.9",
    "axios": "^1.6.5"
  }
}
```

**Archivos a crear:**
- [ ] `mobile/App.tsx`
- [ ] `mobile/app.json`
- [ ] `mobile/src/screens/auth/LoginScreen.tsx`
- [ ] `mobile/src/screens/inspecciones/RealizarInspeccionScreen.tsx`
- [ ] `mobile/src/navigation/AppNavigator.tsx`

---

### FASE 4: Testing (Estimado: 1 semana)

**Backend Tests:**
- [ ] Tests unitarios de servicios
- [ ] Tests E2E de endpoints críticos

**Frontend Tests:**
- [ ] Tests de componentes principales
- [ ] Tests de integración de flujos

---

## 🎯 Prioridades Recomendadas

### 🔴 Alta Prioridad (MVP Funcional)

1. Backend: Auth completo (login/register)
2. Backend: Módulo de Inspecciones
3. Backend: Módulo de Checklists
4. Web: Login + Dashboard básico
5. Web: Crear y realizar inspección
6. Backend: Generación de PDF básico

### 🟡 Media Prioridad

7. Backend: Módulo de Hallazgos
8. Backend: Módulo de Acciones Correctivas
9. Web: Gestión de checklists
10. Mobile: App básica con inspecciones
11. Backend: Dashboard con métricas

### 🟢 Baja Prioridad (Mejoras)

12. Tests automatizados
13. PWA offline completo
14. Notificaciones push
15. Reportes avanzados

---

## 💡 Consejos para el Desarrollo

### Orden de Implementación Backend

1. **Empezar por Prisma:**
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```

2. **Crear módulos en este orden:**
   - Auth (base para todo)
   - Usuarios (necesario para Auth)
   - Checklists (independiente)
   - Inspecciones (usa Checklists)
   - Hallazgos (usa Inspecciones)
   - Acciones Correctivas (usa Hallazgos)

3. **Probar con Swagger:**
   - Después de cada endpoint, probarlo en Swagger UI

### Orden de Implementación Frontend

1. **Setup inicial:**
   - Configurar Vite + React
   - Configurar MUI theme
   - Crear layout base

2. **Auth primero:**
   - Login page
   - Context de autenticación
   - Protected routes

3. **Flujo principal:**
   - Dashboard
   - Lista de inspecciones
   - Crear inspección
   - Realizar inspección

### Patrones de Código

**DTOs en Backend:**
```typescript
// Siempre validar con class-validator
export class CreateInspeccionDto {
  @IsUUID()
  checklistId: string;

  @IsString()
  @MinLength(3)
  sector: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
```

**Servicios en Backend:**
```typescript
// Siempre inyectar dependencias
@Injectable()
export class InspeccionesService {
  constructor(
    private prisma: PrismaService,
    private reportesService: ReportesService
  ) {}
}
```

**Hooks personalizados en Frontend:**
```typescript
// web/src/hooks/useInspecciones.ts
export function useInspecciones() {
  return useQuery({
    queryKey: ['inspecciones'],
    queryFn: () => InspeccionesService.getAll(),
  });
}
```

---

## 🧪 Cómo Probar que Todo Funciona

### Checklist de Pruebas

1. **Backend:**
   - [ ] Puedo registrar usuario
   - [ ] Puedo hacer login y recibo JWT
   - [ ] Puedo crear checklist
   - [ ] Puedo crear inspección
   - [ ] Puedo registrar items de checklist
   - [ ] Puedo finalizar inspección
   - [ ] Puedo generar PDF

2. **Web:**
   - [ ] Puedo hacer login
   - [ ] Veo dashboard con datos
   - [ ] Puedo crear checklist
   - [ ] Puedo iniciar inspección
   - [ ] Puedo completar checklist
   - [ ] Puedo descargar PDF

3. **Mobile:**
   - [ ] Puedo hacer login
   - [ ] Puedo crear inspección
   - [ ] Puedo tomar fotos
   - [ ] Datos se sincronizan

---

## 📞 Dudas o Problemas

Si tienes dudas durante la implementación:

1. **Revisa la documentación:**
   - `ARQUITECTURA_TECNICA.md`
   - `MANUAL_IMPLEMENTACION.md`
   - `ESTRUCTURA_COMPLETA.md`

2. **Consulta ejemplos:**
   - Los archivos ya creados siguen patrones claros
   - Copia la estructura de módulos existentes

3. **Stack Overflow y Docs:**
   - [NestJS Docs](https://docs.nestjs.com/)
   - [Prisma Docs](https://www.prisma.io/docs)
   - [React Query Docs](https://tanstack.com/query/latest)

---

**¡Éxito con la implementación!** 🚀

El proyecto tiene bases sólidas. Siguiendo esta guía paso a paso, tendrás un sistema completo y funcional.
