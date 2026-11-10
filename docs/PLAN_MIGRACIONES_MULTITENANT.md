# Plan de migraciones multiempresa

Este documento es un plan. No contiene ni aplica migraciones en la rama de
diseño.

## Principios

- Migraciones aditivas y reversibles donde sea posible.
- Sin `DROP`, `TRUNCATE`, eliminación de datos ni cambios de producción.
- Backfill con conteos antes/después y transacciones pequeñas.
- La demo continúa funcionando con contexto legacy durante la transición.
- No convertir columnas a `NOT NULL` hasta verificar el backfill.

## Secuencia

### M0 — Preparación

Respaldar la base de desarrollo, capturar conteos de empresas, usuarios,
checklists, inspecciones, hallazgos y acciones, y agregar pruebas de aislamiento.

### M1 — Tablas nuevas

Agregar `organizaciones`, `membresias_organizacion`, `accesos_empresa`,
`accesos_establecimiento`, `establecimientos` y sus índices. Agregar enums
nuevos sin cambiar los actuales.

### M2 — Backfill

Por cada `Empresa` existente: crear una organización `PYME`, asociarla,
crear el establecimiento `Principal`, crear membresías de organización,
crear accesos de empresa conservando el rol actual y asociar inspecciones al
establecimiento principal. Mantener `Usuario.empresaId`.

### M3 — Dual read

Resolver el contexto nuevo, conservar `empresaId` y `rol` en JWT y respuestas,
y mantener los payloads actuales sin permitir empresas no autorizadas.

### M4 — Dual write

Las altas y cambios escriben relaciones nuevas y columnas legacy. Se registran
discrepancias para reconciliación de sólo lectura.

### M5 — Endurecimiento

Hacer obligatorios los campos nuevos donde corresponda y retirar autoridad de
`Usuario.empresaId` y `Usuario.rol`. No eliminarlos físicamente sin una fase
posterior y aprobada.

## Validaciones y rollback

Comparar conteos, validar acceso original de cada usuario, probar aislamiento
entre organizaciones, reportes y fotografías, y verificar login/refresh en cada
etapa. Antes de M5 el rollback consiste en desactivar el contexto nuevo y usar
la ruta legacy; no se borra información nueva.
