# Validación Fase 6A — Demo online

## Alcance

Validación sobre `feature/demo-online`, basada en `d17b866`, con PostgreSQL
local de desarrollo y datos ficticios. No se ejecutó deploy público, no se
modificaron datos de producción y no se eliminaron volúmenes.

## Resultados verificables

| Comprobación | Resultado |
|---|---|
| `pnpm --filter seh-backend build` | OK |
| `pnpm --filter seh-web build` | OK; Vite deja sólo warning de chunk grande |
| `pnpm --filter seh-mobile exec tsc --noEmit` | OK |
| `pnpm --filter seh-backend exec jest --runInBand` | OK; 4 suites, 9 tests |
| Seed demo ejecutado dos veces | OK; idempotente, sin borrar registros |
| `docker compose --env-file deploy/demo.env.example config --quiet` | OK |
| `docker build --file backend/Dockerfile --tag seh-backend-demo-validation .` | OK |
| `docker build --file web/Dockerfile --tag seh-web-demo-validation .` | OK; warning de chunk grande de Vite |
| `GET /api/health` | HTTP 200 |
| E2E multiempresa | OK; autenticación, contextos, inspección, foto, PDF y accesos cruzados |
| E2E administración | OK; empresas, establecimientos y asignaciones |
| E2E revocación | OK; una sesión JWT activa perdió acceso efectivo |
| E2E informes | OK; datos, período vacío, múltiples establecimientos y contexto inválido |

## Datos de demo

`backend/prisma/seed.demo.ts` crea una consultora ficticia, tres empresas
cliente, cuatro establecimientos, cuatro usuarios, permisos, checklists,
inspecciones, hallazgos y acciones correctivas. El seed no elimina registros y
no contiene información de Lombardi ni de terceros.

Las credenciales se mantienen fuera de esta documentación; deben obtenerse
únicamente ejecutando el seed en una base local o de demo aislada.

## Seguridad y operación

- Los `.env` reales permanecen ignorados y no están versionados.
- `deploy/demo.env.example` contiene sólo placeholders.
- El registro público queda deshabilitado sin configuración explícita segura.
- Compose exige secretos JWT, contraseña PostgreSQL y origen CORS.
- PostgreSQL no se publica al exterior y las evidencias usan `seh_uploads`.
- La configuración de HTTPS, backups y recuperación está en `DEMO_ONLINE.md`.

## Responsive y navegador

La validación visual previa confirmó dashboard y descarga de PDF en el navegador
local disponible. No se pudo fijar exactamente `390x844` ni `1440x900` porque
Playwright no está instalado en el workspace y el navegador integrado no
expone control de viewport. Por lo tanto, esas dimensiones quedan pendientes
de una ejecución con una herramienta que admita viewport explícito.

## Estado de publicación

SEH está técnicamente preparado como candidata de demo, pero antes de publicar
requiere infraestructura con Docker, PostgreSQL persistente exclusivo,
dominio/DNS, HTTPS mediante proxy inverso, almacenamiento de backups y
monitoreo de logs y healthchecks. No se realizó deploy público.
