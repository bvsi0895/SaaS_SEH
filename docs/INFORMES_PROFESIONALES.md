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
correctivas por estado, resumen ejecutivo, responsable técnico, numeración de
páginas y miniaturas proporcionales de fotografías autorizadas. Un período sin
inspecciones también produce un informe válido y explícito.

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

El logo se incrusta sólo si `logoUrl` apunta a un archivo bajo el almacenamiento
local `uploads` o a un `data:image` permitido y acotado. Si falta o es inválido,
se conserva el encabezado tipográfico y se informa la incidencia. Las URLs
HTTP/HTTPS y `file:` son rechazadas; no se realizan solicitudes salientes.

Las fotografías se leen mediante el servicio protegido de hallazgos, nunca
desde una URL remota. Se limitan a 12 imágenes, 2 MB por imagen y 8 MB totales;
una foto ausente, inválida o excedente se omite y se informa en el PDF.

## Verificación

`pnpm --filter seh-backend test:informes:e2e` verifica contra PostgreSQL local:

- PDF con el período completo de desarrollo.
- PDF de período sin inspecciones.
- PDF filtrado por establecimiento autorizado.
- PDF con logo local y PDF sin logo.
- PDF con logo remoto rechazado sin interrumpir la generación.
- PDF con múltiples establecimientos y fotografías válidas e inválidas en la
  suite del generador.
- Rechazo de establecimiento inexistente.
- Rechazo de contexto inválido.
