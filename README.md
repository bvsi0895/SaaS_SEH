# 🛡️ SEH - Sistema de Seguridad e Higiene

> Sistema SaaS completo para gestión de inspecciones de Seguridad e Higiene en plantas industriales

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)

---

## 📋 Descripción

**SEH** es una plataforma integral para técnicos de Seguridad e Higiene que permite:

- ✅ Realizar inspecciones digitales en planta usando checklists personalizables
- ✅ Registrar hallazgos con evidencia fotográfica y geolocalización
- ✅ Gestionar acciones correctivas con seguimiento completo
- ✅ Generar reportes PDF profesionales automáticamente
- ✅ Visualizar dashboards con métricas clave de seguridad
- ✅ Trabajar offline y sincronizar cuando hay conexión (PWA)

## 🏗️ Arquitectura del Proyecto

Este es un **monorepo** que contiene:

```
SEH/
├── backend/          # API REST con NestJS + Prisma + PostgreSQL
├── web/              # Aplicación web PWA con React + Vite
├── mobile/           # App móvil con React Native + Expo
├── docs/             # Documentación completa del proyecto
├── package.json      # Configuración del workspace
└── README.md         # Este archivo
```

## 🚀 Stack Tecnológico

### Backend
- **NestJS** - Framework Node.js profesional con arquitectura modular
- **Prisma** - ORM moderno con migraciones y tipos seguros
- **PostgreSQL** - Base de datos relacional robusta
- **JWT** - Autenticación y autorización
- **PDFKit** - Generación de reportes PDF
- **Jest** - Testing automatizado

### Web App
- **React 18** - Librería UI moderna
- **Vite** - Build tool ultrarrápido
- **TypeScript** - Tipado estático
- **Material-UI (MUI)** - Componentes profesionales
- **React Query** - Gestión de estado del servidor
- **PWA** - Service Workers para soporte offline
- **Vitest** - Testing de componentes

### Mobile App
- **React Native** - Framework multiplataforma
- **Expo** - Toolchain para desarrollo rápido
- **React Navigation** - Navegación nativa
- **Expo Camera** - Captura de fotos
- **Expo Location** - Geolocalización
- **AsyncStorage** - Persistencia local

## 📦 Instalación Rápida

### Requisitos previos
- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8 (recomendado) o npm >= 9

### 1. Clonar e instalar dependencias

```bash
cd SEH
pnpm install  # Instala todas las dependencias del workspace
```

### 2. Configurar base de datos

```bash
# Crear base de datos PostgreSQL
createdb seh_db

# Configurar variables de entorno del backend
cd backend
cp .env.example .env
# Editar .env con tus credenciales de DB
```

### 3. Ejecutar migraciones

```bash
cd backend
pnpm prisma migrate dev
pnpm prisma db seed  # Datos de ejemplo
```

### 4. Iniciar servicios

```bash
# Terminal 1 - Backend
cd backend
pnpm dev

# Terminal 2 - Web
cd web
pnpm dev

# Terminal 3 - Mobile (opcional)
cd mobile
pnpm start
```

## 📚 Documentación Completa

Toda la documentación está en la carpeta `docs/`:

- **[Manual de Implementación](./docs/MANUAL_IMPLEMENTACION.md)** - Guía paso a paso para desarrolladores
- **[Manual del Técnico](./docs/MANUAL_USUARIO_TECNICO.md)** - Cómo usar el sistema en campo
- **[Manual del Administrador](./docs/MANUAL_USUARIO_ADMIN.md)** - Gestión de checklists y dashboards
- **[Arquitectura Técnica](./docs/ARQUITECTURA_TECNICA.md)** - Decisiones de diseño y diagramas

## 🎯 Funcionalidades Principales

### Para Técnicos
- Realizar inspecciones usando checklists predefinidos
- Capturar fotos de hallazgos directamente desde móvil
- Registrar observaciones y nivel de riesgo
- Generar reportes PDF en el momento
- Trabajar offline y sincronizar después

### Para Supervisores/Administradores
- Crear y gestionar checklists personalizados
- Visualizar dashboard con métricas de seguridad
- Gestionar acciones correctivas
- Asignar responsables y fechas de compromiso
- Exportar datos para análisis

## 🧪 Testing

```bash
# Backend
cd backend
pnpm test              # Tests unitarios
pnpm test:e2e          # Tests de integración
pnpm test:cov          # Cobertura

# Web
cd web
pnpm test              # Tests de componentes
pnpm test:ui           # UI de testing interactiva
```

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Encriptación bcrypt para contraseñas
- Middleware de autorización por roles
- Validación de entrada con class-validator
- Rate limiting en endpoints críticos
- CORS configurado correctamente
- Sanitización de datos de usuario

## 📊 Modelo de Datos

El sistema maneja las siguientes entidades principales:

- **Usuario** - Técnicos, supervisores y administradores
- **Empresa** - Organizaciones con múltiples usuarios
- **Checklist** - Plantillas de inspección personalizables
- **Inspección** - Registros de inspecciones realizadas
- **Hallazgo** - Problemas detectados durante inspecciones
- **AcciónCorrectiva** - Seguimiento de resolución de hallazgos

Ver [esquema completo](./docs/ARQUITECTURA_TECNICA.md#modelo-de-datos) en la documentación.

## 🛣️ Roadmap

### ✅ Versión 1.0 (MVP - Actual)
- Sistema de inspecciones completo
- Gestión de hallazgos y acciones correctivas
- Reportes PDF
- Dashboard básico
- Apps web y móvil

### 🔮 Versión 2.0 (Planificado)
- **IA para detección automática de riesgos** en fotos
- **Análisis predictivo** de tendencias de seguridad
- **Asistente virtual** para completar checklists
- **OCR** para digitalizar documentos en papel
- **Integración** con sistemas ERP
- **Notificaciones push** y email automáticas
- **Modo multiendeudatario** (multi-tenant)

## 👥 Contribución

Este proyecto está diseñado para ser extensible. Para contribuir:

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

Seguimos [Conventional Commits](https://www.conventionalcommits.org/).

## 📝 Licencia

Copyright © 2025 SEH. Todos los derechos reservados.

## 🆘 Soporte

Para reportar problemas o solicitar funcionalidades:
- Crear un issue en el repositorio
- Email: soporte@seh.com

---

**Desarrollado con ❤️ para mejorar la seguridad en plantas industriales**
