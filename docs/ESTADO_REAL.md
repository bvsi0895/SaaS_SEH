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
