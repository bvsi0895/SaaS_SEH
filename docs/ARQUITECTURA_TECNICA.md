# 🏛️ Arquitectura Técnica del Sistema SEH

## 📊 Visión General

SEH es un sistema SaaS modular construido con arquitectura de microservicios frontend (web + mobile) conectados a una API REST centralizada.

```
┌─────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                    │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                   │
│   📱 Web App (PWA)       │   📱 Mobile App                   │
│   React + Vite           │   React Native + Expo             │
│   - Dashboard            │   - Inspecciones en campo         │
│   - Gestión checklists   │   - Captura fotos                 │
│   - Reportes             │   - Geolocalización               │
│   - Análisis             │   - Modo offline                  │
│                          │                                   │
└──────────────┬───────────┴───────────┬───────────────────────┘
               │                       │
               │  HTTP/REST (JWT)      │
               │                       │
┌──────────────┴───────────────────────┴───────────────────────┐
│                     CAPA DE API (Backend)                     │
│                                                                │
│   🚀 NestJS + TypeScript                                      │
│   ┌────────────────────────────────────────────────────┐     │
│   │  Controllers (Rutas HTTP)                          │     │
│   │  ↓                                                  │     │
│   │  Services (Lógica de negocio)                      │     │
│   │  ↓                                                  │     │
│   │  Repositories (Acceso a datos via Prisma)          │     │
│   └────────────────────────────────────────────────────┘     │
│                                                                │
│   📦 Módulos principales:                                     │
│   - Auth (JWT, roles, permisos)                               │
│   - Usuarios & Empresas                                       │
│   - Checklists                                                │
│   - Inspecciones                                              │
│   - Hallazgos                                                 │
│   - Acciones Correctivas                                      │
│   - Dashboard & Reportes                                      │
│                                                                │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        │  Prisma ORM
                        │
┌───────────────────────┴────────────────────────────────────────┐
│                   CAPA DE PERSISTENCIA                         │
│                                                                 │
│   🗄️  PostgreSQL Database                                     │
│                                                                 │
│   Tablas principales:                                          │
│   - empresas                                                   │
│   - usuarios                                                   │
│   - checklists / checklist_items                               │
│   - inspecciones / inspeccion_items                            │
│   - hallazgos                                                  │
│   - acciones_correctivas                                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

Servicios externos:
┌──────────────────┐     ┌──────────────────┐
│   📸 Storage     │     │   📧 Email       │
│   (Local/S3)     │     │   (futuro)       │
└──────────────────┘     └──────────────────┘
```

## 🎯 Decisiones de Diseño

### Backend: ¿Por qué NestJS?

**NestJS** fue elegido sobre Express puro por:

1. **Arquitectura modular** lista para producción
2. **TypeScript** nativo con decoradores
3. **Dependency Injection** incorporada
4. **Documentación automática** con Swagger
5. **Testing** integrado con Jest
6. **Escalabilidad** - fácil agregar microservicios después
7. **Comunidad** activa y enterprise-ready

**Alternativas consideradas:**
- ❌ Express puro: requiere mucha configuración manual
- ❌ Fastify: menos maduro para empresas
- ✅ **NestJS**: balance perfecto entre productividad y estructura

### Base de Datos: ¿Por qué PostgreSQL + Prisma?

**PostgreSQL** por:
- Robustez y confiabilidad probada
- Soporte JSON para datos flexibles
- Transacciones ACID
- Full-text search para futuras búsquedas avanzadas
- Extensiones (PostGIS para geolocalización futura)

**Prisma** como ORM por:
- Type-safety completo desde DB hasta frontend
- Migraciones automáticas
- Studio visual para inspeccionar datos
- Queries optimizadas automáticamente
- Mejor DX (Developer Experience) que TypeORM

### Frontend Web: ¿Por qué React + Vite + MUI?

**React** sigue siendo el estándar de industria con:
- Ecosistema maduro
- Fácil encontrar desarrolladores
- Compatibilidad con React Native (código compartible)

**Vite** sobre Create React App por:
- ⚡ Build ultrarrápido (HMR instantáneo)
- Optimizado para TypeScript
- Configuración mínima

**Material-UI (MUI)** por:
- Componentes profesionales listos
- Accesibilidad (a11y) incorporada
- Tema personalizable
- Grid system responsive
- Iconografía completa

**PWA** permite:
- Instalación en dispositivo
- Trabajo offline con Service Workers
- Cache de datos recientes
- Notificaciones push (futuro)

### Mobile: ¿Por qué React Native + Expo?

**React Native** por:
- Código compartido con web (~60-70%)
- Un solo lenguaje (TypeScript)
- Performance nativa
- Comunidad enorme

**Expo** por:
- Setup inmediato (sin Xcode/Android Studio)
- OTA updates (sin pasar por stores)
- APIs nativas listas (Camera, Location, FileSystem)
- Desarrollo más rápido

## 📐 Arquitectura del Backend en Capas

```
┌─────────────────────────────────────────────────┐
│              HTTP Request (Express)              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│                MIDDLEWARE LAYER                  │
│  - Auth Guard (JWT verification)                │
│  - Roles Guard (permissions)                    │
│  - Validation Pipe (DTO validation)             │
│  - Logging Interceptor                          │
│  - Exception Filters                            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│              CONTROLLER LAYER                    │
│  - Recibe HTTP request                          │
│  - Valida con DTOs                               │
│  - Delega a Services                             │
│  - Retorna HTTP response                         │
│                                                  │
│  Ejemplo:                                        │
│  @Post('inspecciones')                           │
│  create(@Body() dto, @CurrentUser() user) {     │
│    return this.service.create(dto, user.id);    │
│  }                                               │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│               SERVICE LAYER                      │
│  - Lógica de negocio                             │
│  - Validaciones complejas                        │
│  - Orquestación de repositorios                  │
│  - Manejo de transacciones                       │
│                                                  │
│  Ejemplo:                                        │
│  async create(dto, userId) {                     │
│    // Validar checklist existe                   │
│    // Validar usuario tiene permisos             │
│    // Crear inspección                           │
│    // Crear items relacionados                   │
│    return inspeccion;                            │
│  }                                               │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│             REPOSITORY LAYER (Prisma)            │
│  - Acceso directo a base de datos                │
│  - Queries optimizadas                           │
│  - Relaciones eager/lazy loading                 │
│                                                  │
│  prisma.inspeccion.create({                      │
│    data: { ...dto },                             │
│    include: { checklist: true, usuario: true }  │
│  })                                              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│                 DATABASE (PostgreSQL)            │
└──────────────────────────────────────────────────┘
```

## 🔐 Sistema de Autenticación

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ 1. POST /auth/login { email, password }
       ├──────────────────────────────────────────┐
       │                                           │
┌──────┴───────┐                         ┌────────┴─────────┐
│  Controller  │                         │   Service        │
└──────┬───────┘                         └────────┬─────────┘
       │                                           │
       │                              2. Validar credenciales
       │                                  (bcrypt compare)
       │                                           │
       │                           3. Generar tokens (JWT)
       │                              - Access token (7d)
       │                              - Refresh token (30d)
       │                                           │
       │ 4. Return { accessToken, refreshToken, user }
       │←──────────────────────────────────────────┤
       │
       │ 5. Cliente guarda tokens
       │    - Access token: memoria / localStorage
       │    - Refresh token: httpOnly cookie (futuro)
       │
       │ 6. Requests siguientes incluyen:
       │    Header: Authorization: Bearer <accessToken>
       ├──────────────────────────────────────────┐
       │                                           │
┌──────┴────────┐                       ┌─────────┴────────┐
│  JWT Guard    │                       │  JWT Strategy    │
└──────┬────────┘                       └─────────┬────────┘
       │                                           │
       │                          7. Decodificar y validar JWT
       │                             Verificar firma
       │                             Verificar expiración
       │                                           │
       │                          8. Buscar usuario en DB
       │                             Verificar activo
       │                                           │
       │ 9. Usuario disponible en @CurrentUser()   │
       │←──────────────────────────────────────────┤
```

### Roles y Permisos

```typescript
enum Rol {
  ADMIN_EMPRESA,  // Puede gestionar todo de su empresa
  SUPERVISOR,     // Puede ver y gestionar inspecciones
  TECNICO         // Puede realizar inspecciones
}

// Ejemplo de uso
@Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('dashboard')
getDashboard() { }
```

## 📦 Modelo de Datos Detallado

### Relaciones entre entidades

```
Empresa (1) ──────── (N) Usuario
   │                       │
   │                       │
   │                       │ (realiza)
   │                       │
   │                       ↓
   │                  Inspeccion (N)
   │                       │
   │                       │ (contiene)
   │                       │
   │                       ↓
   │                  InspeccionItem (N)
   │                       │
   │                       │ (detecta)
   │ (gestiona)            │
   │                       ↓
   ↓                   Hallazgo (N)
Checklist (1)              │
   │                       │ (genera)
   │ (tiene)               │
   │                       ↓
   ↓              AccionCorrectiva (N)
ChecklistItem (N)          │
                           │ (asignada a)
                           │
                           ↓
                       Usuario (responsable)
```

### Flujo de Datos: Realizar una Inspección

```
1. Técnico selecciona Checklist
   ↓
2. Sistema crea Inspeccion (estado: EN_PROGRESO)
   - empresaId
   - checklistId
   - usuarioId
   - sector/área
   - fechaHoraInicio
   ↓
3. Por cada ChecklistItem:
   ↓
4. Técnico marca: CUMPLE / NO_CUMPLE / NO_APLICA
   ↓
5. Si NO_CUMPLE → Registrar Hallazgo
   - título
   - descripción
   - nivelRiesgo (BAJO/MEDIO/ALTO/CRITICO)
   - fotos
   - ubicación
   ↓
6. Técnico finaliza inspección
   - estado: COMPLETADA
   - fechaHoraFin
   ↓
7. Sistema genera PDF automático
   ↓
8. Supervisor crea AccionesCorrectivas
   - hallazgoId
   - responsableId
   - fechaCompromiso
   - estado: PENDIENTE
   ↓
9. Responsable actualiza estado
   - EN_PROGRESO
   - RESUELTA (con evidencia)
```

## 🔄 Sincronización Offline (PWA/Mobile)

```
┌──────────────────────┐
│   Usuario offline    │
│   (sin internet)     │
└──────────┬───────────┘
           │
           │ 1. Realiza inspección localmente
           │
┌──────────┴───────────┐
│   LocalStorage /     │
│   AsyncStorage       │
│                      │
│   - Inspecciones     │
│   - Hallazgos        │
│   - Fotos (base64)   │
└──────────┬───────────┘
           │
           │ 2. Usuario vuelve online
           │
┌──────────┴───────────┐
│   Servicio Sync      │
│                      │
│   - Detecta conexión │
│   - Lee cola local   │
│   - Envía a backend  │
│   - Marca sincronizado
└──────────┬───────────┘
           │
           │ 3. POST /sync/inspecciones
           │
┌──────────┴───────────┐
│      Backend API     │
│                      │
│   - Valida datos     │
│   - Guarda en DB     │
│   - Retorna IDs      │
└──────────────────────┘
```

## 📊 Generación de PDFs

```typescript
// Arquitectura del generador de PDFs

┌─────────────────────────────────────────┐
│  GET /reportes/inspecciones/:id/pdf     │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│  ReportesService                        │
│                                         │
│  1. Buscar inspección completa:         │
│     - Include empresa (con logo)        │
│     - Include usuario                   │
│     - Include checklist + items         │
│     - Include hallazgos (con fotos)     │
│     - Include acciones correctivas      │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│  PDFInspeccionGenerator                 │
│                                         │
│  2. Crear documento PDFKit:             │
│     ┌─────────────────────────────┐    │
│     │  HEADER                      │    │
│     │  - Logo empresa              │    │
│     │  - Título "Reporte Inspección"│  │
│     │  - Fecha                     │    │
│     └─────────────────────────────┘    │
│     ┌─────────────────────────────┐    │
│     │  DATOS GENERALES             │    │
│     │  - Técnico                   │    │
│     │  - Sector                    │    │
│     │  - Fecha/hora inicio-fin     │    │
│     └─────────────────────────────┘    │
│     ┌─────────────────────────────┐    │
│     │  CHECKLIST                   │    │
│     │  Tabla:                      │    │
│     │  | Item | Cumple | Obs |     │    │
│     │  |------|--------|-----|     │    │
│     │  | ...  | ✓/✗/NA | ... |     │    │
│     └─────────────────────────────┘    │
│     ┌─────────────────────────────┐    │
│     │  HALLAZGOS                   │    │
│     │  Por cada hallazgo:          │    │
│     │  - Título y descripción      │    │
│     │  - Nivel riesgo (coloreado)  │    │
│     │  - Fotos (thumbnails)        │    │
│     │  - Acciones correctivas      │    │
│     └─────────────────────────────┘    │
│     ┌─────────────────────────────┐    │
│     │  FIRMA DIGITAL               │    │
│     │  - Técnico                   │    │
│     │  - Fecha generación          │    │
│     └─────────────────────────────┘    │
│                                         │
│  3. Retornar Buffer del PDF             │
└──────────────┬──────────────────────────┘
               │
┌──────────────┴──────────────────────────┐
│  Response: application/pdf              │
│  Content-Disposition: inline/attachment │
└─────────────────────────────────────────┘
```

## 🧪 Estrategia de Testing

### Backend

```
tests/
├── unit/
│   ├── auth.service.spec.ts
│   ├── inspecciones.service.spec.ts
│   └── dashboard.service.spec.ts
│
├── integration/
│   ├── auth.e2e.spec.ts
│   ├── inspecciones.e2e.spec.ts
│   └── reportes.e2e.spec.ts
│
└── fixtures/
    └── test-data.ts
```

**Cobertura mínima esperada:** 70%

### Frontend Web

```
tests/
├── components/
│   ├── Button.test.tsx
│   ├── DataTable.test.tsx
│   └── Modal.test.tsx
│
├── pages/
│   ├── LoginPage.test.tsx
│   └── InspeccionesPage.test.tsx
│
└── hooks/
    └── useAuth.test.ts
```

## 🚀 Despliegue

### Arquitectura de Producción Recomendada

```
┌────────────────────────────────────────────────┐
│              Internet / Usuarios               │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────┴────────────────────────────┐
│              CDN (Cloudflare)                  │
│  - Web app estática (PWA)                      │
│  - Imágenes optimizadas                        │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────┴────────────────────────────┐
│         Load Balancer (NGINX/AWS ALB)          │
└───────────────────┬────────────────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
┌─────┴─────────┐       ┌─────────┴─────────┐
│  Backend API  │       │  Backend API      │
│  Instance 1   │       │  Instance 2       │
│  (Docker)     │       │  (Docker)         │
└─────┬─────────┘       └─────────┬─────────┘
      │                           │
      └─────────────┬─────────────┘
                    │
┌───────────────────┴────────────────────────────┐
│       PostgreSQL (RDS / Managed DB)            │
│       - Primary + Replica                      │
│       - Backups automáticos                    │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│       S3 / Object Storage                      │
│       - Fotos de hallazgos                     │
│       - PDFs generados                         │
└────────────────────────────────────────────────┘
```

### Variables de Entorno por Ambiente

**Development:**
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/seh_dev
JWT_SECRET=dev-secret
LOG_LEVEL=debug
```

**Staging:**
```env
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db:5432/seh_staging
JWT_SECRET=staging-secret-random-xyz
LOG_LEVEL=info
```

**Production:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-db:5432/seh_production
JWT_SECRET=ultra-secure-random-production-secret
LOG_LEVEL=warn
STORAGE_TYPE=s3
AWS_S3_BUCKET=seh-production-files
```

## 🔮 Roadmap Técnico v2.0

### Integraciones IA Planificadas

1. **Detección automática de riesgos en fotos**
   - Modelo: TensorFlow.js / OpenAI Vision
   - Detectar EPP faltantes, derrames, obstrucciones
   - Sugerencias automáticas de nivel de riesgo

2. **Asistente virtual para inspecciones**
   - LLM: GPT-4 / Claude
   - Completado inteligente de observaciones
   - Sugerencias de acciones correctivas

3. **Análisis predictivo**
   - ML para predecir zonas de riesgo
   - Tendencias históricas
   - Recomendaciones preventivas

4. **OCR para documentos**
   - Digitalización de reportes en papel
   - Extracción automática de datos

---

**Decisión técnica clave:** Arquitectura modular permite agregar estos módulos de IA como microservicios independientes sin reescribir el core.
