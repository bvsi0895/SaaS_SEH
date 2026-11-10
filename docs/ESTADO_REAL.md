# Estado real del proyecto SEH

Fecha de corte: 2026-11-09
Rama de estabilización: `feature/estabilizacion-mvp`

## Inventario

- `backend`: NestJS 10, Prisma 5, PostgreSQL, JWT y Swagger/OpenAPI.
- `web`: React 18, Vite, MUI, React Query y Axios.
- `mobile`: Expo 50, Expo Router, React Native, Axios y Secure Store.
- `docs`: documentación operativa y técnica existente.
- `docker-compose*.yml`: servicios de desarrollo y producción.

No se detectaron paquetes compartidos. Cada cliente mantiene sus propios tipos y cliente Axios.

## Dependencias y reproducibilidad

- Antes de la estabilización no había lockfile.
- Se agregó `pnpm-workspace.yaml` para declarar `backend`, `web` y `mobile`.
- Se generó `pnpm-lock.yaml` con `pnpm install --lockfile-only --ignore-scripts`.
- Los nombres reales de los paquetes son `seh-backend`, `seh-web` y `seh-mobile`; los filtros del root fueron corregidos.

## Seguridad de configuración

Se encontraron `.env` reales en `backend` y `mobile`. Sus valores no fueron impresos ni incorporados al repositorio. `.gitignore` ahora excluye `.env.*` y permite solamente los archivos `.env.example`.

Las variables detectadas son `DATABASE_URL`, secretos JWT, configuración de CORS, almacenamiento, rate limit y `EXPO_PUBLIC_API_URL`. Deben rotarse si alguno de esos `.env` fue compartido o comprometido.

## Contratos incompatibles detectados y corregidos

- Backend expone `GET /auth/me`; web y mobile solicitaban `GET /auth/profile`.
- Backend devuelve `usuario`; web y mobile esperaban `user`.
- Backend actualiza usuarios con `PUT /usuarios/:id`; web usaba `PATCH`.
- Se agregó `GET /usuarios/tecnicos`, usado por el selector de responsables del web.
- La pantalla de perfil ahora usa `PATCH /usuarios/me/password`, que es el contrato backend existente.

## Bloqueos pendientes

- El formulario web de registro no envía `empresaId`, pero `RegisterDto` lo exige y además valida UUID. Los campos `empresaNombre` y `empresaCuit` del formulario no son aceptados por el backend. Resolverlo requiere una decisión de negocio sobre alta de empresa; no se inventó esa lógica.
- El cambio de contraseña administrativa de la pantalla de usuarios llama una ruta inexistente (`/usuarios/:id/password`) y requiere definir el contrato/permiso antes de implementarlo.
- La compilación final queda pendiente de que termine la instalación de los 1.597 paquetes del workspace; no se declara éxito sin esa verificación.

## Base de datos

No se ejecutaron migraciones, seeds, resets ni operaciones destructivas.
