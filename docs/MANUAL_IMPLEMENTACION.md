# 📘 Manual de Implementación - Sistema SEH

> Guía completa para desarrolladores que desean instalar, configurar y desplegar el sistema SEH

## 📋 Requisitos Previos

### Software Necesario

| Herramienta | Versión Mínima | Propósito |
|-------------|----------------|-----------|
| **Node.js** | 18.0.0 | Runtime para backend y build tools |
| **pnpm** | 8.0.0 | Gestor de paquetes (recomendado) |
| **PostgreSQL** | 14.0 | Base de datos principal |
| **Git** | 2.30+ | Control de versiones |
| **VS Code** | Latest | Editor recomendado |

### Opcional pero Recomendado

- **Docker** & **Docker Compose** - Para levantar DB rápidamente
- **Postman** / **Insomnia** - Para probar la API
- **pgAdmin** - GUI para PostgreSQL

---

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd SEH
```

### 2. Instalar Dependencias del Monorepo

```bash
# Instalar pnpm globalmente si no lo tienes
npm install -g pnpm

# Instalar todas las dependencias del workspace
pnpm install
```

Esto instalará dependencias de `backend/`, `web/` y `mobile/` automáticamente.

---

## 🗄️ Configurar Base de Datos

### Opción A: PostgreSQL Local

**1. Instalar PostgreSQL:**

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**MacOS (con Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Descargar instalador desde [postgresql.org](https://www.postgresql.org/download/windows/)

**2. Crear base de datos:**

```bash
# Acceder a PostgreSQL
sudo -u postgres psql

# Crear usuario y base de datos
CREATE USER seh_user WITH PASSWORD 'seh_password_secure';
CREATE DATABASE seh_db OWNER seh_user;
GRANT ALL PRIVILEGES ON DATABASE seh_db TO seh_user;

# Salir
\q
```

### Opción B: PostgreSQL con Docker (Más Rápido)

```bash
# Crear archivo docker-compose.yml en la raíz
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: seh_user
      POSTGRES_PASSWORD: seh_password_secure
      POSTGRES_DB: seh_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
EOF

# Levantar contenedor
docker-compose up -d

# Verificar que está corriendo
docker-compose ps
```

---

## ⚙️ Configurar Backend

### 1. Variables de Entorno

```bash
cd backend

# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tu editor favorito
nano .env  # o code .env
```

**Configuración mínima requerida:**

```env
# Base de datos
DATABASE_URL="postgresql://seh_user:seh_password_secure@localhost:5432/seh_db?schema=public"

# JWT - IMPORTANTE: Cambiar en producción
JWT_SECRET="tu-secreto-super-seguro-cambialo-en-produccion-min-32-chars"
JWT_EXPIRATION="7d"

# Servidor
PORT=3000
NODE_ENV=development

# CORS (agregar URLs de tu frontend)
CORS_ORIGIN="http://localhost:5173,http://localhost:8081"

# Almacenamiento
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
```

### 2. Generar Cliente Prisma

```bash
pnpm prisma:generate
```

Este comando genera el cliente de Prisma basado en `schema.prisma`.

### 3. Ejecutar Migraciones

```bash
# Crear y aplicar migraciones
pnpm prisma:migrate

# Esto creará todas las tablas en la base de datos
```

### 4. Poblar con Datos de Ejemplo (Seed)

```bash
pnpm prisma:seed
```

Esto creará:
- 1 empresa de ejemplo
- 3 usuarios (admin, supervisor, técnico)
- 2 checklists de ejemplo
- Algunos datos de prueba

**Credenciales de prueba:**
```
Admin:
  Email: admin@ejemplo.com
  Password: Admin123!

Técnico:
  Email: tecnico@ejemplo.com
  Password: Tecnico123!
```

### 5. Verificar Instalación del Backend

```bash
# Iniciar servidor en modo desarrollo
pnpm dev

# Deberías ver:
# 🚀 Servidor SEH iniciado correctamente
# 📡 API: http://localhost:3000
# 📚 Documentación: http://localhost:3000/api/docs
```

**Probar endpoint:**
```bash
curl http://localhost:3000/api/docs
# Debería abrir Swagger UI
```

---

## 🌐 Configurar Aplicación Web

### 1. Variables de Entorno

```bash
cd ../web

# Copiar archivo de ejemplo
cp .env.example .env
```

**Configuración `.env`:**

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME="SEH - Seguridad e Higiene"
VITE_ENVIRONMENT=development
```

### 2. Iniciar Aplicación Web

```bash
pnpm dev

# Debería iniciar en http://localhost:5173
```

### 3. Verificar PWA

1. Abrir http://localhost:5173
2. Abrir DevTools → Application → Service Workers
3. Verificar que el SW se registró correctamente

---

## 📱 Configurar Aplicación Móvil

### 1. Instalar Expo CLI

```bash
npm install -g expo-cli eas-cli
```

### 2. Configurar Variables de Entorno

```bash
cd ../mobile

# Crear .env
cat > .env << 'EOF'
API_URL=http://10.0.2.2:3000  # Para emulador Android
# API_URL=http://localhost:3000  # Para iOS Simulator
# API_URL=http://192.168.1.X:3000  # Para dispositivo físico (tu IP local)
EOF
```

### 3. Iniciar Expo

```bash
pnpm start

# O para plataforma específica:
pnpm android  # Android
pnpm ios      # iOS (solo en Mac)
```

### 4. Probar en Dispositivo

1. Instalar **Expo Go** desde Play Store / App Store
2. Escanear QR que aparece en terminal
3. La app se cargará en tu dispositivo

---

## 🧪 Ejecutar Tests

### Backend

```bash
cd backend

# Tests unitarios
pnpm test

# Tests con cobertura
pnpm test:cov

# Tests E2E
pnpm test:e2e

# Tests en modo watch
pnpm test:watch
```

### Web

```bash
cd web

# Tests unitarios
pnpm test

# Tests con UI interactiva
pnpm test:ui

# Tests con cobertura
pnpm test:cov
```

---

## 🔧 Troubleshooting Común

### Problema: Error de conexión a base de datos

**Error:**
```
Error: Can't reach database server at localhost:5432
```

**Solución:**
1. Verificar que PostgreSQL está corriendo:
   ```bash
   # Linux/Mac
   sudo systemctl status postgresql

   # Docker
   docker-compose ps
   ```
2. Verificar credenciales en `.env`
3. Verificar puerto (5432 por defecto)

### Problema: Puerto 3000 ya en uso

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# Encontrar proceso usando puerto 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Matar proceso
kill -9 <PID>

# O cambiar puerto en .env
PORT=3001
```

### Problema: Migraciones fallan

**Error:**
```
Error: Migration failed to apply
```

**Solución:**
```bash
# Resetear base de datos (CUIDADO: borra todos los datos)
pnpm prisma migrate reset

# O aplicar manualmente
pnpm prisma migrate deploy
```

### Problema: CORS en desarrollo

**Error en navegador:**
```
Access to fetch blocked by CORS policy
```

**Solución:**
Verificar que `CORS_ORIGIN` en backend `.env` incluye la URL del frontend:
```env
CORS_ORIGIN="http://localhost:5173,http://localhost:8081"
```

### Problema: Prisma Client no sincronizado

**Error:**
```
PrismaClientValidationError: Unknown arg...
```

**Solución:**
```bash
cd backend
pnpm prisma:generate
pnpm prisma migrate dev
```

---

## 📊 Herramientas de Desarrollo

### Prisma Studio (GUI para DB)

```bash
cd backend
pnpm prisma:studio

# Abre en http://localhost:5555
# Permite ver y editar datos visualmente
```

### Swagger API Docs

Una vez iniciado el backend:
- Ir a http://localhost:3000/api/docs
- Documentación interactiva de todos los endpoints
- Probar requests directamente desde el navegador

### Logs y Debugging

**Backend:**
```typescript
// En development, los logs de Prisma están activos
// Ver queries ejecutadas en consola
```

**Web:**
```bash
# React DevTools
# Instalar extensión de navegador
# Redux DevTools (si se usa Redux/Zustand)
```

**Mobile:**
```bash
# Logs en tiempo real
npx react-native log-android  # Android
npx react-native log-ios      # iOS
```

---

## 🚢 Preparar para Producción

### 1. Build del Backend

```bash
cd backend

# Compilar TypeScript a JavaScript
pnpm build

# Resultado en carpeta dist/
# Ejecutar: node dist/main.js
```

### 2. Build de la Web App

```bash
cd web

# Build optimizado para producción
pnpm build

# Resultado en carpeta dist/
# Servir con: npx serve dist
```

### 3. Build de la App Móvil

```bash
cd mobile

# Android APK
eas build --platform android

# iOS
eas build --platform ios

# Requiere cuenta Expo
```

### 4. Variables de Entorno de Producción

**Backend `.env.production`:**
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@production-db:5432/seh"
JWT_SECRET="<SECRETO-ULTRA-SEGURO-GENERADO-ALEATORIAMENTE>"
CORS_ORIGIN="https://seh.tudominio.com"
STORAGE_TYPE=s3
AWS_S3_BUCKET=seh-production-files
LOG_LEVEL=warn
```

**Web `.env.production`:**
```env
VITE_API_URL=https://api.seh.tudominio.com
VITE_ENVIRONMENT=production
```

### 5. Migración a Producción

```bash
# En servidor de producción
cd backend

# Aplicar migraciones (sin recrear DB)
pnpm prisma migrate deploy

# NO ejecutar prisma migrate dev en producción
```

---

## 🐳 Deployment con Docker

### Dockerfile Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
COPY prisma ./prisma/

RUN pnpm prisma:generate
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### docker-compose.yml Producción

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://seh_user:${DB_PASSWORD}@postgres:5432/seh_db
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: seh_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: seh_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./web/dist:/usr/share/nginx/html

volumes:
  postgres_data:
```

### Desplegar

```bash
# Construir y levantar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Aplicar migraciones
docker-compose exec backend pnpm prisma migrate deploy
```

---

## 📈 Monitoreo y Logs

### Logs en Producción

```bash
# Ver logs del backend
pm2 logs seh-backend

# O con Docker
docker-compose logs -f backend
```

### Healthcheck Endpoint

```bash
# Verificar que la API está viva
curl http://localhost:3000/health

# Respuesta esperada:
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected"
}
```

---

## 🔐 Seguridad - Checklist Pre-Producción

- [ ] Cambiar `JWT_SECRET` a valor aleatorio seguro (min 32 caracteres)
- [ ] Usar HTTPS (certificado SSL)
- [ ] Configurar rate limiting
- [ ] Habilitar CORS solo para dominios específicos
- [ ] Usar variables de entorno (nunca hardcodear secretos)
- [ ] Backups automáticos de base de datos
- [ ] Logs de auditoría de acciones críticas
- [ ] Actualizar dependencias regularmente
- [ ] Implementar WAF (Web Application Firewall)

---

## 📞 Soporte

Si encuentras problemas durante la implementación:

1. Revisar este manual
2. Consultar [ARQUITECTURA_TECNICA.md](./ARQUITECTURA_TECNICA.md)
3. Buscar en Issues del repositorio
4. Crear nuevo Issue con:
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Versiones de software

---

**¡Implementación completada con éxito!** 🎉

Ahora puedes continuar con:
- [Manual del Técnico](./MANUAL_USUARIO_TECNICO.md)
- [Manual del Administrador](./MANUAL_USUARIO_ADMIN.md)
