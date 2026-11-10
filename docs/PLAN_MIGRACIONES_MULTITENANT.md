# Plan de migraciones multiempresa

Este documento define una migración aditiva para revisión. No contiene ni
aplica migraciones en la rama de diseño.

## Principios

- Usar exclusivamente la base local de desarrollo respaldada.
- No ejecutar `DROP`, `TRUNCATE`, borrados de historial ni cambios en
  producción.
- Mantener `Usuario.empresaId` y `Usuario.rol` durante toda la transición.
- Crear relaciones nuevas antes de hacerlas obligatorias.
- Detener el backfill ante cualquier empresa, usuario o recurso sin ámbito
  determinista.
- Registrar conteos, errores, discrepancias y posibilidad de rollback en cada
  etapa.

## M0 — Preparación y validación

1. Crear respaldo de la base local y verificar que sea restaurable en una base
   de desarrollo nueva.
2. Capturar conteos de usuarios, empresas, checklists, inspecciones,
   hallazgos, acciones, fotografías e informes.
3. Identificar usuarios con `empresaId` nulo o inconsistencias de roles.
4. Agregar pruebas de aislamiento entre dos organizaciones para una misma
   empresa antes de activar el contexto nuevo.

## M1 — Estructura aditiva

Crear enums y tablas nuevas:

- `Organizacion`;
- `OrganizacionMiembro`;
- `OrganizacionEmpresa` con `UNIQUE(organizacionId, empresaId)`;
- `Establecimiento` y su índice/clave de empresa;
- `AccesoEmpresa` ligado a `OrganizacionEmpresa` y
  `OrganizacionMiembro`;
- `AccesoEstablecimiento`.

Agregar `organizacionEmpresaId` a los modelos privados que lo requieran,
inicialmente nullable, con índices y claves foráneas. Para modelos que heredan
ámbito desde `Inspeccion`, mantener esa herencia como contrato del servicio y
evitar duplicar columnas innecesarias.

## M2 — Backfill determinista

Para cada `Empresa` existente:

1. Crear una organización inicial `PYME` con identificador estable y nombre
   derivado, sólo si no existe.
2. Crear exactamente un `OrganizacionEmpresa` inicial para esa organización y
   empresa.
3. Crear un `Establecimiento` `Principal` sólo cuando el modelo vigente no
   tenga un establecimiento equivalente.
4. Crear `OrganizacionMiembro` para los usuarios legacy de esa empresa,
   conservando una regla explícita para elegir `OWNER`/`ADMIN_ORG` y dejando
   inconsistencias en un reporte de revisión.
5. Crear `AccesoEmpresa` por usuario con el rol operativo legacy.
6. Asignar checklists e inspecciones al vínculo inicial mediante su
   `empresaId`; si un registro no permite determinar el ámbito, no inventar
   una asociación y detener ese registro para revisión.
7. Completar `organizacionEmpresaId` en hallazgos, acciones, fotografías e
   informes por la inspección autorizada.

El backfill no crea vínculos adicionales con consultoras. Esas relaciones se
crean posteriormente mediante una acción administrativa explícita y nunca por
coincidencia de `empresaId`.

## M3 — Dual read

Resolver el contexto nuevo y filtrar por `organizacionEmpresaId`. Mantener
`empresaId` y `rol` en JWT y respuestas legacy, pero ignorarlos como autoridad.
La demo debe continuar funcionando a través del vínculo inicial creado en M2.

## M4 — Dual write

Las altas y modificaciones escriben primero el ámbito nuevo y mantienen los
campos legacy necesarios. Toda escritura verifica membresía, vínculo,
`AccesoEmpresa` y establecimiento. Las discrepancias se registran sin borrar
datos.

## M5 — Endurecimiento

Después de comparar conteos y completar las pruebas:

- hacer obligatorio `organizacionEmpresaId` para datos privados nuevos;
- prohibir repositorios que reciban sólo `empresaId` para autorizar;
- rechazar tokens o contextos sin relación activa;
- mantener los campos legacy sólo mientras exista compatibilidad comprobada;
- retirar autoridad de `Usuario.empresaId` y `Usuario.rol` en una fase posterior
  y aprobada, sin eliminar historial.

## Validaciones, rollback y riesgos

Cada etapa debe validar conteos, relaciones, accesos, reportes y fotografías.
El rollback inicial consiste en desactivar la resolución de contexto nuevo y
usar el camino legacy, sin eliminar las tablas ni datos agregados.

Riesgos restantes:

- elegir incorrectamente el miembro inicial de una organización durante el
  backfill;
- recursos históricos sin una inspección o empresa determinable;
- informes o archivos servidos por rutas que hoy sólo reciben `empresaId`;
- divergencias entre campos legacy y ámbito nuevo durante dual write;
- necesidad de una decisión adicional si dos consultoras deben compartir un
  expediente concreto mediante una autorización explícita.
