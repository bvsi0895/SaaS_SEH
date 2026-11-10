# Validación Fase 5B — Presentación profesional

Rama: `feature/informes-profesionales`  
Base: `8b6cef6`  
Entorno: PostgreSQL local de desarrollo, datos ficticios

## Implementación

- Logo local de organización incrustado con ajuste proporcional.
- Encabezado tipográfico de respaldo cuando no hay logo.
- Rechazo de orígenes `http`, `https` y `file` para evitar SSRF.
- Fotografías leídas mediante `HallazgosService`, con contexto de empresa y
  organización validado antes de leerlas.
- Máximo 12 fotografías, 2 MB por imagen y 8 MB acumulados.
- Validación de firmas JPEG, PNG y WEBP.
- Miniaturas proporcionales y paginación con pie institucional y número de
  página.
- Incidencias de logo/fotografías informadas dentro del PDF sin abortar la
  generación.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| PDF sin logo | Aprobado |
| PDF con logo local | Aprobado por E2E real |
| Logo remoto inválido | Rechazado sin bloquear el PDF |
| PDF con múltiples establecimientos | Aprobado por E2E real |
| Fotografías válidas e inválidas | Unit tests aprobados |
| Período sin inspecciones | Aprobado |
| Acceso cruzado a fotografía | Aprobado en regresión multiempresa existente |
| Backend build | Aprobado |
| Web build | Aprobado; warning Vite de chunk >500 kB |
| Mobile TypeScript | Aprobado |
| Jest | 4 suites, 9 tests aprobados |
| E2E informes | Aprobado; logo, períodos, establecimientos y contexto inválido |

La E2E restaura el `logoUrl` original y elimina el archivo temporal y el
establecimiento ficticio al finalizar.

La inspección visual del PDF regenerado confirmó 2 páginas A4, sin páginas en
blanco, con encabezado, dos miniaturas de evidencias, responsable técnico, pie
institucional y numeración consistente. Las evidencias ficticias existentes se
visualizaron como miniaturas negras, sin afectar la estructura del documento.

## Validación visual

Se verificó desde el navegador local el login, dashboard, selector de
establecimiento y descarga real de:

`C:\Users\Jorge\Downloads\informe-mensual-2026-11.pdf`

La herramienta de navegador disponible no permitió fijar viewport exacto y el
workspace no contiene Playwright instalado. Por lo tanto:

- `390×844`: no aprobado visualmente; pendiente de una herramienta con emulación.
- `1440×900`: no aprobado como dimensión exacta; se observó el dashboard en el
  viewport de escritorio disponible y la descarga funcionó.

No se declara completa la validación responsive exacta.
