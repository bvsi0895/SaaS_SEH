# SEH — Validación Fase 3D

Fecha: 2026-11-10  
Rama: `feature/multitenant-seguridad`  
Base de trabajo: `da8418e`

## Resultado ejecutivo

La validación HTTP real contra el backend y PostgreSQL local demostró aislamiento entre dos organizaciones vinculadas a la misma empresa: login, contextos, checklists, inspecciones, hallazgos, fotografía, PDF y accesos cruzados rechazados.

La entidad base `Empresa` continúa compartida por diseño; sus conteos operativos en `GET /empresas/me` y `GET /empresas/:id` quedan filtrados por el contexto activo.

## Cambios realizados

- Web y mobile consultan `GET /api/auth/contextos` y persisten únicamente `organizacionEmpresaId` como preferencia.
- El backend valida `X-Organizacion-Empresa-Id` en `JwtAuthGuard` contra membresía, acceso activo, relación activa y empresa del token.
- El cambio de contexto limpia la caché de consultas y la sesión limpia la preferencia persistida.
- Las operaciones de checklist protegen también actualización, eliminación y reorder de ítems.
- Usuarios y estadísticas de empresa se filtran por el contexto de organización activo cuando corresponde.
- Los endpoints de empresa no exponen conteos operativos de otra organización vinculada al mismo cliente.
- `AccesoEmpresa.usuarioId` fue eliminado. La relación canónica es `AccesoEmpresa.organizacionMiembroId`.

## Prisma y migraciones

La causa de la inconsistencia histórica era el orden lexicográfico: `20261110_init` quedaba después de `20261110063411_add_multitenant_scope`, por lo que una base nueva intentaba aplicar la migración multiempresa antes de crear las tablas legacy.

Corrección aplicada:

- `20261110_init` fue renombrada a `20261110000000_init`.
- Se agregó `20261110070000_normalize_acceso_empresa`.
- La migración de normalización falla de forma segura si `usuarioId` contiene datos; en la base local había 5 registros y 0 valores no nulos.
- No se ejecutó `migrate reset`, no se eliminaron tablas y se conservó el historial.
- Se verificó `prisma migrate deploy` y `prisma migrate status` en una base PostgreSQL nueva aislada.
- `prisma migrate dev --create-only --skip-seed` superó la shadow database sin generar cambios reales; la migración vacía de verificación fue eliminada.

Se conservó el respaldo previo en `backend/logs/seh_db_phase3d_prechange.dump` (ignorado por Git).

## E2E HTTP ejecutado

Comando:

```text
pnpm --filter seh-backend test:multitenant:e2e
```

Resultado: **OK**.

El script crea datos ficticios temporales, ejecuta dos tokens JWT y dos contextos, verifica:

- contextos autorizados;
- checklists independientes;
- inspecciones independientes;
- rechazo de lectura cruzada de inspecciones y checklists;
- hallazgos independientes;
- fotografía propia y rechazo de fotografía ajena;
- PDF propio y rechazo de PDF ajeno;
- rechazo de un header que selecciona el contexto de otra organización.

El `finally` elimina los registros temporales. La comprobación posterior devolvió cero usuarios y cero organizaciones con prefijos E2E.

## Validaciones técnicas

| Validación | Resultado |
|---|---|
| Backend build | Aprobado después de detener el proceso que bloqueaba Prisma Client |
| Web build | Aprobado previamente; sólo warning de chunk grande de Vite |
| Mobile TypeScript | Aprobado previamente |
| Prisma generate | Aprobado |
| Migraciones en base nueva | Aprobado |
| E2E HTTP multiempresa | Aprobado |
| Suite backend completa | Aprobada: 3 suites, 7 tests |

## Riesgos y pendientes

1. La entidad `Empresa` es compartida deliberadamente; los datos base no son expedientes operativos y los conteos de los endpoints de contexto sí están aislados.
2. La migración quedó verificada en una base nueva y aplicada en desarrollo; no se aplicó ninguna base productiva.
3. No se modificó el modelo comercial, ni se incorporaron offline, IA, merge o deploy.
