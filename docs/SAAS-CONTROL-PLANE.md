# Núcleo de administración SaaS

PR35 agrega el plano comercial sin cambiar el rol operativo de `Usuario` ni utilizar `OWNER` como superadministrador.

## Modelo

- `PlanSaaS`: catálogo de planes y límites de usuarios y empresas.
- `SuscripcionSaaS`: una suscripción por consultora, estado, período y vencimientos de demo.
- `AuditoriaSuscripcionSaaS`: historial inmutable de transiciones comerciales y actor.
- `AdministradorSaaS`: autorización central explícita para el propietario de SEH. La provisión de esta relación es una operación controlada del propietario y no se expone públicamente.

La migración crea `LEGACY_COMPAT`, `DEMO_15_DIAS` y `PROFESIONAL`. Cada organización existente recibe una suscripción activa `LEGACY_COMPAT` con un ID determinista; no se modifican inspecciones, usuarios, empresas ni referencias históricas.

## API para el futuro panel

Todas las rutas administrativas requieren JWT y una fila activa en `administradores_saas`:

- `GET /api/saas/admin/planes`
- `GET /api/saas/admin/organizaciones`
- `GET /api/saas/admin/organizaciones/:id`
- `GET /api/saas/admin/organizaciones/:id/auditoria`
- `POST /api/saas/admin/organizaciones/:id/prueba` — demo configurable; por defecto 15 días mediante `SAAS_TRIAL_DAYS`.
- `POST /api/saas/admin/organizaciones/:id/activar`
- `POST /api/saas/admin/organizaciones/:id/suspender`
- `POST /api/saas/admin/organizaciones/:id/cancelar`

Para la cuenta activa, aun cuando sus operaciones estén bloqueadas por vencimiento o suspensión:

- `GET /api/saas/cuenta/estado`

El panel podrá usar este contrato para listar consultoras, mostrar estado efectivo, plan, consumo actual, límites y auditoría; pagos, checkout, registro público y alta automática quedan fuera de PR35.

## Límites y vencimientos

Las altas de miembros y empresas se validan dentro de la misma transacción que crea la relación. Antes del conteo se toma un `pg_advisory_xact_lock` por organización, evitando que solicitudes concurrentes superen el cupo. Las operaciones de una suscripción `SUSPENDIDA`, `VENCIDA` o `CANCELADA` se rechazan; el endpoint de estado permanece disponible para regularización.

## Provisión del administrador central

El registro del propietario en `administradores_saas` debe realizarse por un procedimiento operativo controlado, con revisión de identidad. No se reutilizan `OWNER`, `ADMIN_ORGANIZACION` ni ningún rol de empresa para obtener acceso central.

