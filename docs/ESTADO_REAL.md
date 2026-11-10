# Estado real del proyecto SEH

Fecha de corte: 2026-11-09
Rama de estabilización: `feature/estabilizacion-mvp`
Ubicación definitiva de desarrollo: `D:\Proyectos\SEH`
Respaldo preservado: `F:\4-Trabajos\Portafolio\Proyecto SEH\SEH`

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

## Validación de instalación y builds

- `pnpm install --offline --ignore-scripts --frozen-lockfile` confirmó que el lockfile resuelve y que el store local contiene los paquetes.
- El store está en `F:\.pnpm-store\v11`; no hubo descargas durante las pruebas.
- La instalación global quedó interrumpida durante el enlazado de `node_modules` (51/1.597 paquetes en la última ejecución). La instalación filtrada del backend alcanzó 815/815 paquetes del virtual store, pero no creó enlaces utilizables de `backend/node_modules/.bin` mientras el workspace raíz quedó incompleto.
- No se ejecutaron builds/typechecks verificables: los comandos de pnpm desde la raíz vuelven a preparar el workspace completo antes de ejecutar scripts.

### Prueba controlada en SSD

- F: es un HDD interno SATA Hitachi de 500 GB, NTFS, unidad fija y saludable, con aproximadamente 222 GB libres.
- C: es un SSD interno SATA CT1000BX500, NTFS, con aproximadamente 384 GB libres.
- Node `v22.23.3`, pnpm `11.25.0` y npm `10.9.9`.
- Una copia temporal sin `.git`, `.env`, `node_modules`, builds ni ZIPs en `C:\Users\Jorge\Documents\Codex\work\seh-install-test` instaló los 1.597 paquetes en 1m23s con el mismo lockfile.
- La diferencia confirma que el bloqueo es la velocidad de enlazado/escritura del HDD F:, no la resolución de dependencias.
- En la copia SSD: backend build OK después de `prisma generate`; web build OK con warning de chunk >500 kB; mobile typecheck falló inicialmente por `process.env` sin `@types/node` y quedó OK después de agregar esa dependencia.

## Bloqueos pendientes

- El registro público no recibe `empresaId` ni `rol`: usa `PUBLIC_REGISTRATION_EMPRESA_ID` del servidor y asigna `TECNICO`. Si la variable no está configurada, el endpoint queda deshabilitado.
- El cambio de contraseña administrativa usa `PATCH /usuarios/:id/password`, protegido para `ADMIN_EMPRESA`, limitado a la misma empresa e invalidando refresh tokens.
- El workspace original F: todavía no tiene un enlazado completo utilizable; los resultados de build fueron verificados en la copia SSD equivalente.

## Base de datos

No se ejecutaron migraciones, seeds, resets ni operaciones destructivas.

## Tests

En la copia SSD, `pnpm --filter seh-backend test -- --runInBand` terminó con `No tests found`: no existen archivos `*.spec.ts`. No hay scripts de tests configurados para web o mobile.

## Siguiente verificación

Completar el enlazado global en una unidad local o con la exclusión de antivirus aplicada al workspace/store; luego ejecutar los builds y typechecks desde este mismo checkout.
