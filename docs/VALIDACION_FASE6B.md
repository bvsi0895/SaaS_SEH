# Validación Fase 6B — Preparación final de demo

## Alcance

Validación en `feature/demo-online`, sobre la base `6d5b818`, con PostgreSQL
local y datos ficticios. No se accedió a Oracle Cloud, no se hizo deploy y no
se modificó ninguna base productiva.

## Resultados

| Prueba | Resultado |
|---|---|
| Playwright móvil `390×844` | OK, 1 test pasado |
| Playwright escritorio `1440×900` | OK, 1 test pasado |
| Login y dashboard | OK |
| Cambio de contexto a Industria Demo Norte | OK; se invalidó caché y se recargó el contexto |
| Empresas, establecimientos y técnicos | OK desde administración |
| Inspecciones y detalle | OK |
| Descarga PDF desde la interfaz | OK; Playwright recibió descarga `.pdf` en ambos viewports |
| Checklists, hallazgos y acciones | OK; navegación verificada |
| Errores de consola | Ninguno en las pruebas finales |
| Fallos reales de red | Ninguno; se excluyeron sólo abortos normales por navegación |
| Backend build | OK |
| Web build | OK; warning no bloqueante de chunk grande de Vite |
| Mobile TypeScript | OK |
| Jest | OK; 4 suites, 9 tests |
| E2E HTTP multiempresa | OK; incluyó fotografía y PDF |
| E2E HTTP administración | OK |
| E2E HTTP revocación | OK |
| E2E HTTP informes | OK |

Las capturas de las pantallas principales están en `docs/VALIDACION_FASE6B/`.

## Correcciones realizadas

- Se activó `ThrottlerGuard` como guarda global; la configuración previa no se
  estaba aplicando efectivamente.
- Se corrigieron rutas de inspecciones, hallazgos y reportes para aceptar IDs
  legacy de la demo, manteniendo las comprobaciones de empresa y contexto en
  los servicios.
- Se añadió validación de firma binaria para fotografías JPG, PNG y WEBP.
- Se corrigió el desplazamiento superior de tabs administrativos en móvil.
- Se endureció Compose: PostgreSQL y backend quedan sólo en la red interna;
  web se publica únicamente en localhost para el proxy HTTPS.
- Se agregaron healthcheck web, límites de memoria y rotación básica de logs.

## Evidencia y límites

La prueba Playwright navegó por login, dashboard, administración, inspecciones,
detalle, checklists, hallazgos y acciones, y descargó un PDF desde la lista de
inspecciones. El flujo real de fotografías continúa cubierto por el E2E HTTP
multiempresa; la suite visual no adjunta una foto para no contaminar la base
demo local.

La cobertura de rate limiting es global (100 solicitudes por minuto por la
configuración actual) y no usa almacenamiento distribuido. Es adecuada para
una demo pequeña, pero debe revisarse antes de una exposición pública amplia.
