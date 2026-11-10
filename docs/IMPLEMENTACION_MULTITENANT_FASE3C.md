# Implementación multiempresa — Fase 3C

Fecha: 2026-11-10  
Rama: `feature/multitenant-seguridad`  
Commit de referencia: `37d1e68`

## Estado verificado

La primera implementación del modelo aprobado fue aplicada sobre la base
local `seh_db`. No se modificaron bases productivas, no se hizo merge y no se
hizo deploy.

Migración aplicada:

`20261110063411_add_multitenant_scope`

El SQL fue revisado antes de aplicarse. Es aditivo: crea enums, tablas,
índices, claves foráneas y columnas de ámbito nullable para la transición. No
contiene `DROP`, `TRUNCATE` ni borrado de registros.

El comando `prisma migrate dev` quedó bloqueado por una inconsistencia histórica
de la migración shadow; la migración inicial declarada y la base existente no
son reproducibles en shadow en ese punto. Se utilizó `prisma migrate deploy`
exclusivamente contra la base local después de revisar el SQL. `prisma migrate
status` confirmó el esquema actualizado.

## Backfill

Script idempotente:

`backend/prisma/backfill-multitenant.ts`

Comando:

`pnpm --filter seh-backend prisma:backfill-multitenant`

Primer resultado:

- Empresas procesadas: 2.
- Organizaciones iniciales creadas: 2.
- Vínculos `OrganizacionEmpresa` creados: 2.
- Membresías procesadas: 5.
- Accesos explícitos creados/procesados: 5.
- Checklists con ámbito: 5.
- Inspecciones con ámbito: 5.
- Acciones correctivas con ámbito: 4.

Segundo resultado: 0 organizaciones y 0 vínculos nuevos, demostrando que el
backfill no duplica al repetirse.

Conteos finales de la base local:

```text
empresas: 2
usuarios: 5
organizaciones: 2
vinculos: 2
membresias: 5
accesos: 5
inspecciones_con_ambito: 5
acciones_con_ambito: 4
```

Respaldo previo utilizado:

`backend/logs/seh_db_phase3c_prechange.dump`

## Seguridad implementada

- `TenancyService` resuelve sólo membresías y accesos activos.
- El JWT incorpora `organizacionEmpresaId` resuelto por backend.
- Se agregó `GET /api/auth/contextos` para consultar contextos autorizados.
- Checklists, inspecciones, hallazgos, fotografías, acciones, dashboard y
  reportes filtran por `organizacionEmpresaId` además de `empresaId`.
- PDFs y fotografías verifican el ámbito antes de servir el recurso.
- El frontend no puede convertir un `empresaId` en autoridad.
- Se conservaron `Usuario.empresaId` y `Usuario.rol` para compatibilidad legacy.

## Pruebas ejecutadas

Tests unitarios backend:

```text
3 suites passed
7 tests passed
```

Verificación real contra PostgreSQL:

`pnpm --filter seh-backend test:multitenant:isolation`

Resultado: dos consultoras temporales vinculadas a la misma empresa sólo
recibieron sus propias inspecciones. La transacción se revirtió y no dejó datos
de prueba.

Builds y typecheck:

- Backend: OK.
- Web: OK; Vite emitió sólo la advertencia existente de chunk mayor a 500 kB.
- Mobile TypeScript: OK.

## Estado histórico y cierre de pendientes en Fase 3D

1. Fase 3D integró el selector persistente en web/mobile y la validación del
   header en backend.
2. Las operaciones de edición, eliminación y reorder de ítems validan el
   ámbito del checklist padre.
3. El E2E HTTP con dos tokens reales cubre fotografía, PDF y accesos cruzados.
4. El orden de migraciones se corrigió renombrando la inicial a
   `20261110000000_init`; `migrate deploy`, `migrate status` y shadow database
   fueron verificados en una base nueva.
5. `AccesoEmpresa.usuarioId` fue eliminado mediante migración aditiva con
   precondición de datos no nulos; la relación vigente es la membresía.

Los riesgos residuales y la suite final están documentados en
`docs/VALIDACION_MULTITENANT_FASE3D.md`.

