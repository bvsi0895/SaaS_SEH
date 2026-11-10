# Decisiones técnicas de estabilización

## Workspace y dependencias

Se adopta pnpm como gestor único. `pnpm-workspace.yaml` es la fuente de verdad del monorepo y los scripts usan los nombres de paquete declarados en cada `package.json`. Se conserva un único lockfile en la raíz.

## Contrato de autenticación

Se conserva el contrato NestJS actual: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh` y `POST /auth/logout`. La respuesta usa la propiedad `usuario`, tal como documenta `AuthResponseDto`; los clientes fueron alineados a ese nombre.

## OpenAPI y cliente tipado

NestJS ya genera el documento OpenAPI en `/api/docs`. La decisión es usar ese documento como fuente para una futura generación de tipos compartidos, sin duplicar modelos Prisma en los clientes. En esta jornada se corrigieron los clientes Axios existentes y sus tipos de respuesta para estabilizar el contrato actual; la generación automática queda como siguiente paso después de lograr un build limpio.

## Registro

No se altera el flujo de registro para crear empresas automáticamente: eso sería una nueva decisión funcional. El bloqueo se documenta para que el producto defina si el registro recibe un `empresaId` existente o si crea una empresa mediante un flujo separado.

## Seguridad

Los `.env` reales quedan fuera de Git y nunca se imprimen. No se rotan secretos automáticamente porque eso requeriría coordinar los entornos desplegados.
