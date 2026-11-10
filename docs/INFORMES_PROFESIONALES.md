# Informes profesionales y métricas

## Alcance implementado

La rama `feature/informes-profesionales` agrega un informe mensual PDF sobre
el contexto autorizado por la sesión. El endpoint es:

`GET /api/reportes/mensual.pdf?fechaDesde=<ISO>&fechaHasta=<ISO>&establecimientoId=<opcional>`

El backend toma `empresaId`, `organizacionEmpresaId` y `accesoEmpresaId` del
contexto resuelto por `JwtAuthGuard`; esos valores no se aceptan como autoridad
desde la URL. El parámetro de establecimiento sólo funciona si pertenece a la
empresa contextual y, cuando el acceso tiene restricciones explícitas, si está
incluido en `AccesoEstablecimiento`.

El PDF incluye consultora, empresa, período, establecimientos incluidos,
inspecciones completadas, hallazgos agrupados por nivel de riesgo, acciones
correctivas por estado, resumen ejecutivo, responsable técnico y cantidad de
fotografías asociadas. Un período sin inspecciones también produce un informe
válido y explícito.

El dashboard mantiene los KPIs y tendencias existentes y acepta
`establecimientoId` en resumen, tendencias, sectores, actividad y KPIs. La
interfaz ofrece un selector únicamente con establecimientos devueltos por
`GET /api/auth/establecimientos`, que aplica los permisos del acceso activo,
y permite descargar el informe mensual del contexto actual.

## Seguridad

- Todos los reportes filtran por `organizacionEmpresaId` y `empresaId`.
- Un ID de establecimiento inexistente, de otra empresa o fuera de un acceso
  restringido responde como recurso no encontrado.
- Un contexto inválido en `X-Organizacion-Empresa-Id` es rechazado por el guard.
- Los roles de generación son `ADMIN_EMPRESA` y `SUPERVISOR`.
- No se agregaron migraciones ni se modificó la base de datos.

## Limitaciones conocidas

El campo `logoUrl` de la organización ya forma parte del modelo, pero la
infraestructura existente no define todavía un almacenamiento de logos. El
informe usa la identidad comercial textual y queda pendiente incrustar el
binario del logo cuando exista un origen local seguro. Las fotografías se
contabilizan como evidencias asociadas; su descarga continúa protegida por el
endpoint autenticado de hallazgos y no se expone una URL pública desde el PDF.

## Verificación

`pnpm --filter seh-backend test:informes:e2e` verifica contra PostgreSQL local:

- PDF con el período completo de desarrollo.
- PDF de período sin inspecciones.
- PDF filtrado por establecimiento autorizado.
- Rechazo de establecimiento inexistente.
- Rechazo de contexto inválido.
