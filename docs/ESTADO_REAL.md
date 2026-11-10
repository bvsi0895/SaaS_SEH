# Estado real del proyecto SEH

Fecha de corte: 2026-11-10  
Rama: `feature/estabilizacion-mvp`  
Commit de partida: `3110e10`  
Ubicación de trabajo: `D:\Proyectos\SEH`

## Alcance

Esta fase estabiliza la demo local existente. No incorpora multiempresa nuevo,
offline, IA, merge ni deploy. La empresa de la demo es una única empresa de
desarrollo ya existente en la base local.

## Infraestructura local

- Docker Desktop/Engine operativo; PostgreSQL 16 Alpine en `seh-postgres-dev`.
- Sólo se levantó el servicio `postgres` del compose de SEH.
- Base exclusiva de desarrollo: `seh_db`, usuario `seh_user`, volumen
  `seh_postgres_dev_data`.
- La migración `backend/prisma/migrations/20261110_init/migration.sql` fue
  revisada y aplicada con `prisma migrate deploy`.
- El seed terminó correctamente con datos ficticios. No se ejecutaron reset,
  drop, truncate ni operaciones destructivas.

## Recorrido funcional verificado

Se ejecutó contra `http://localhost:3000` usando el backend compilado y la base
local:

| Paso | Resultado verificado |
|---|---|
| Login | `POST /api/auth/login` → 200 |
| Checklist | `GET /api/checklists` → 200; se creó uno válido con UUID para la demo |
| Inspección | `POST /api/inspecciones` → 201 |
| Detalle y respuesta | `GET /api/inspecciones/:id` → 200; `PATCH /api/inspecciones/:id/item` → 200 |
| Hallazgo | `POST /api/hallazgos` → 201 |
| Acción correctiva | `POST /api/acciones-correctivas` como administrador → 201; técnico sin privilegio → 403 |
| Finalización | `POST /api/inspecciones/:id/finalizar` → 201; estado `COMPLETADA` |
| Reporte | `GET /api/reportes/inspecciones/:id/pdf/download` → 200; PDF real de 3108 bytes con firma `%PDF-` |
| Fotografía | `POST /api/hallazgos/:id/fotos` → 201; descarga autenticada → 200 y firma PNG |
| Aislamiento | usuario de otra empresa recibió 404 al consultar la inspección ajena |

## Seguridad aplicada

- El registro público no acepta `empresaId` ni `rol` del cliente.
- La empresa se toma exclusivamente de `PUBLIC_REGISTRATION_EMPRESA_ID` y el
  rol se fuerza a `TECNICO`.
- Sin esa variable, el registro responde 400 y queda deshabilitado.
- Las fotografías no se sirven como archivos estáticos públicos. Se almacenan
  localmente bajo `backend/uploads/hallazgos` y sólo se leen mediante un
  endpoint autenticado con comprobación de empresa y nombre persistido.
- Los `.env` reales no se imprimieron ni se incorporaron al repositorio; se usa
  `.env.example` como plantilla sin valores operativos.

## Builds y tests

- Backend: `pnpm --filter seh-backend build` → OK después de detener el proceso
  local que mantenía bloqueado el binario nativo de Prisma.
- Web: `pnpm --filter seh-web build` → OK. Vite informa sólo el warning de
  chunk mayor a 500 kB.
- Mobile: `pnpm --filter seh-mobile exec tsc --noEmit` → OK.
- Tests: `pnpm --filter seh-backend exec jest --runInBand` → 2 suites, 4 tests,
  todos OK.
- El comando `pnpm --filter seh-backend test -- --runInBand` no es una forma
  válida en este workspace porque pnpm pasa el separador como patrón a Jest;
  el comando directo anterior es el verificable.

## OpenAPI

Swagger UI está disponible en `http://localhost:3000/api/docs` y el documento
JSON en `http://localhost:3000/api/docs-json`. El inventario de rutas del
recorrido está en `docs/API_OPENAPI.md`.

## Estado final

La demo local completa puede ejecutarse y generar un PDF real. Queda pendiente
automatizar el recorrido HTTP completo como suite e2e separada; los tests
actuales cubren autenticación y autorización de servicio, mientras que el
recorrido completo fue verificado manualmente contra PostgreSQL local.

## Fase 4 — Gestión de consultoras

La rama `feature/gestion-consultoras` incorpora administración contextual de
organizaciones, empresas-clientes, establecimientos, miembros y asignaciones.
La migración aditiva `20261110100000_fase4_admin_consultoras` está aplicada en
la base local de desarrollo. El build backend/web, typecheck mobile, E2E de
administración y E2E de aislamiento multiempresa fueron verificados. La
validación visual confirmó login, alta de empresa, alta de establecimiento y
confirmación de revocación en escritorio. El E2E de revocación demostró `403`
con una sesión JWT que conservaba su token. La emulación móvil exacta 390×844
queda pendiente porque el navegador disponible no expuso control de viewport.

## Fase 5 — Informes profesionales y métricas

La rama `feature/informes-profesionales` parte de `e6511c4` y agrega el
endpoint protegido `GET /api/reportes/mensual.pdf`, con filtros de período y
establecimiento. El informe se genera contra PostgreSQL local, respeta
`organizacionEmpresaId`, valida `AccesoEstablecimiento` cuando existe una
restricción explícita y no acepta IDs de empresa u organización desde el
cliente. El dashboard permite filtrar los indicadores por establecimiento y
descargar el PDF del contexto actual.

Validaciones de esta fase:

- backend build, web build y mobile typecheck: OK;
- Jest: 3 suites y 7 tests OK;
- E2E de informes: OK para período con datos, período sin inspecciones,
  establecimiento autorizado, establecimiento inválido y contexto inválido;
- regresiones de administración, aislamiento multiempresa y revocación: OK.

El PDF ahora incrusta logos locales permitidos o usa encabezado tipográfico si
no hay logo. Las fotografías autorizadas se incrustan como miniaturas con
límites de memoria y paginación; las ausentes se informan sin bloquear el PDF.
La prueba visual real confirmó dashboard y descarga en el escritorio disponible,
pero no se pudo fijar exactamente 390×844 ni 1440×900 porque no hay Playwright
instalado y el navegador integrado no expone emulación de viewport.

## Fase 6A — Preparación de demo online

Se creó `feature/demo-online` desde `d17b866`. Se incorporaron un seed ficticio
idempotente, configuración Docker con pnpm y lockfile, variables de demo sin
secretos, healthcheck `/api/health`, volumen dedicado para evidencias y la
documentación operativa de `docs/DEMO_ONLINE.md`.

Validación ejecutada: backend build, web build, mobile typecheck, Jest (4
suites y 9 tests), seed demo en dos ejecuciones, configuración Compose,
healthcheck local y E2E multiempresa, administración, revocación e informes:
todo OK. La validación exacta de viewport `390×844` y `1440×900` sigue
pendiente porque el entorno no dispone de Playwright ni emulación equivalente.
Los Dockerfiles de backend y web también se construyeron correctamente; Vite
mantiene únicamente el warning de chunk grande. No se realizó deploy público.
El detalle está en
`docs/VALIDACION_FASE6A.md`.

## Fase 6B — Validación final y preparación del despliegue

Se instaló Playwright como dependencia de desarrollo y Chromium local. La
prueba Playwright pasó en los dos viewports exactos: `390×844` y `1440×900`.
Recorrió login, dashboard, cambio de contexto, administración, empresas,
establecimientos, técnicos, inspecciones, detalle, checklists, hallazgos y
acciones. No registró errores de consola ni fallos reales de red.

Se corrigieron el rate limiting global no aplicado, la compatibilidad de IDs
legacy en inspecciones/hallazgos/reportes, la validación binaria de imágenes y
el desplazamiento móvil de tabs administrativos. Compose ahora mantiene
PostgreSQL y backend en la red interna, publica web sólo en loopback y añade
healthcheck, límites de memoria y rotación de logs.

Se realizó backup de PostgreSQL y evidencias, con restauración aislada y
conteos coincidentes: 5 empresas, 9 usuarios, 7 inspecciones, 8 hallazgos y 6
acciones; 7 archivos de evidencia respaldados.

Pendientes antes de una publicación comercial amplia: migrar tokens desde
localStorage a cookies HttpOnly/SameSite, definir rate limiting distribuido y
reemplazar almacenamiento local por almacenamiento privado de objetos si se
requiere alta disponibilidad. El detalle está en
`docs/VALIDACION_FASE6B.md`, `docs/AUDITORIA_SEGURIDAD_DEMO.md`,
`docs/PLAN_BACKUP_RESTAURACION.md` y `docs/CHECKLIST_DESPLIEGUE.md`.
