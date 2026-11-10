# Validación Fase 4

Rama: `feature/gestion-consultoras`  
Base: `c196cb4`  
Base local: PostgreSQL de desarrollo de SEH

## Implementación verificada

- Rama creada desde `c196cb4`.
- Migración aditiva `20261110100000_fase4_admin_consultoras` aplicada localmente.
- Respaldo previo: `backend/logs/seh_db_phase4_prechange.dump`.
- Se agregaron datos de contacto/logo a `Organizacion` y sectores a `Establecimiento`.
- No se eliminaron tablas, relaciones ni historiales.

## Pruebas HTTP

`pnpm --filter seh-backend test:administracion:e2e`

Resultado: **aprobado**. El test creó dos empresas-clientes ficticias,
establecimientos, actualizó un establecimiento, consultó empresas y
asignaciones, y limpió sus registros.

`pnpm --filter seh-backend test:multitenant:e2e`

Resultado: **aprobado**. El aislamiento de dos consultoras, fotografías, PDF,
checklists e inspecciones continúa funcionando.

`pnpm --filter seh-backend test:revocacion:e2e`

Resultado: **aprobado**. Un técnico temporal consultó establecimientos con un
JWT activo; tras revocar su `AccesoEmpresa`, la misma sesión recibió `403`.
Los fixtures fueron eliminados.

## Pruebas desde navegador

Probado en navegador integrado con usuario ficticio administrador:

- login real;
- acceso a `/administracion`;
- pestañas de organización, empresas, establecimientos y técnicos;
- alta visual de una empresa cliente;
- selección de la empresa cliente;
- alta visual de un establecimiento con sectores;
- listado de técnicos y asignaciones;
- botón de revocación con diálogo de confirmación, cancelado sin modificar datos;
- mensajes de éxito y actualización de listas.

Los datos creados durante la prueba visual fueron eliminados al finalizar.
La vista se observó en escritorio con viewport aproximado de 1009×792. La
adaptación responsive está implementada con Grid/Stack. La prueba móvil real
de 390×844 no pudo ejecutarse porque el navegador integrado disponible no
expone emulación o resize de viewport; no se declara aprobada esa parte.

## Validaciones técnicas

| Comando | Resultado |
|---|---|
| `pnpm --filter seh-backend build` | Aprobado |
| `pnpm --filter seh-web build` | Aprobado; warning de chunk Vite >500 kB |
| `pnpm --filter seh-mobile exec tsc --noEmit` | Aprobado |
| `pnpm --filter seh-backend exec jest --runInBand` | 3 suites / 7 tests aprobados |
| `pnpm --filter seh-backend test:revocacion:e2e` | Aprobado; JWT activo rechazado después de revocar |
| `pnpm --filter seh-backend exec prisma migrate status` | Base al día |

## Estado real

La administración funcional de empresas-clientes, establecimientos,
asignaciones y revocación está operativa por HTTP y validada visualmente en
escritorio. La aceptación integral queda pendiente únicamente de una prueba
real en viewport móvil 390×844; la invitación por email queda para una fase
posterior.
