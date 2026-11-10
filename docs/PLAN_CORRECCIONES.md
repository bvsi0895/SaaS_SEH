# Plan de correcciones por jornada

## D1 — Auditoría y diagnóstico

- Inventariar módulos, endpoints, scripts, dependencias y configuración.
- Registrar incompatibilidades de autenticación y perfil.
- Identificar `.env` reales, artefactos generados y ausencia de lockfile.
- Entregables: `ESTADO_REAL.md`, `DECISIONES_TECNICAS.md`.

## D2 — Repositorio, dependencias y configuración

- Crear `feature/estabilizacion-mvp`.
- Agregar `pnpm-workspace.yaml` y corregir filtros.
- Generar `pnpm-lock.yaml` sin ejecutar scripts.
- Ajustar `.gitignore` para secretos, dependencias, builds y ZIPs generados.
- Verificar que sólo `.env.example` sea candidato a seguimiento.

## D3 — Builds y correcciones

- Completar instalación desde lockfile.
- Ejecutar build de backend y web, y typecheck de mobile.
- Corregir errores de compilación sin cambiar reglas de negocio.
- Si pnpm vuelve a bloquearse en el enlazado, mover temporalmente el checkout o el store a una unidad local autorizada; no cambiar de gestor.
- Mantener el build backend como `prisma generate && nest build` para que el cliente Prisma no dependa de postinstall.
- Agregar pruebas unitarias o de integración donde el entorno permita una base de datos de prueba.

## D4 — Contratos API

- Generar y conservar el documento OpenAPI desde NestJS.
- Comparar rutas y payloads contra web y mobile.
- Introducir generación de tipos compartidos cuando el build esté estable.
- Resolver los contratos de registro y cambio de contraseña administrativa con una decisión explícita.

## D5 — Integración y pruebas

- Preparar recorrido registro/login/acceso autenticado.
- Ejecutar pruebas con base de datos aislada y datos efímeros.
- No ejecutar migraciones destructivas ni usar credenciales de producción.
- Registrar resultados, bloqueos y comandos en el cierre de jornada.
