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

## Riesgos pendientes

1. El selector de contexto múltiple todavía expone la lista de contextos, pero
   la selección persistente por sesión/header debe integrarse en web y mobile.
2. Las operaciones de edición de items de checklist deben completar la misma
   verificación de ámbito antes de considerarse endurecidas.
3. Debe añadirse una prueba HTTP e2e con dos tokens reales y endpoints de
   fotografía/PDF, además de los tests de servicio y la verificación SQL.
4. La migración inicial debe corregirse en una fase separada para que
   `prisma migrate dev` reproduzca correctamente el shadow database sin
   depender de `migrate deploy`.
5. Prisma mantiene una columna nullable `usuarioId` técnica en
   `AccesoEmpresa` por la relación inversa legacy; la autorización no la usa,
   pero debe normalizarse en una migración aditiva posterior para que el único
   vínculo de usuario sea la membresía organizacional.

