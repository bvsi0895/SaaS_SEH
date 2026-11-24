# Demo online SEH

## Estado

La rama `feature/demo-online` prepara una candidata reproducible para demo,
pero no ejecuta publicación pública. La base debe ser exclusiva de demo y no
debe reutilizar volúmenes de producción.

## Datos ficticios

Ejecutar sobre una base local o de demo nueva, después de aplicar migraciones:

```powershell
pnpm --filter seh-backend prisma:seed:demo
```

El seed es idempotente y crea una consultora ficticia, tres empresas cliente,
establecimientos, cuatro usuarios, permisos contextualizados, checklists,
inspecciones, hallazgos y acciones correctivas. No elimina registros.

Credenciales demo: el seed imprime los usuarios ficticios al ejecutarse; no se
deben reutilizar en producción ni publicar en documentación comercial.

## Compose reproducible

La preparación actual de la demo pública está documentada en
[`docs/DEMO_DEPLOYMENT.md`](DEMO_DEPLOYMENT.md). Esta rama usa Caddy como
servicio Compose para terminar HTTPS; no requiere publicar directamente el
puerto de Nginx ni exponer PostgreSQL.

1. Copiar `deploy/demo.env.example` a `.env` fuera del control de versiones.
2. Reemplazar todos los valores `REEMPLAZAR_*` con secretos generados.
3. Validar la configuración:

```powershell
docker compose --env-file .env config
```

4. Levantar sólo la demo:

```powershell
docker compose --env-file .env up -d --build
```

El backend ejecuta `prisma migrate deploy` al iniciar y expone
`GET /api/health`. Las fotografías se conservan en el volumen Docker
`seh_uploads`; PostgreSQL utiliza `postgres_data` exclusivo del Compose.

## HTTPS y proxy

`deploy/Caddyfile.example` termina TLS delante del servicio `web` y conserva
`/api` en el mismo origen. No exponer PostgreSQL públicamente. Si existe un
proxy HTTPS compartido, seguir el procedimiento de coexistencia de
`docs/INFRAESTRUCTURA_DEMO.md` y no iniciar dos terminadores para el mismo
puerto o dominio.

## Backups y recuperación

Usar `scripts/backup-demo.sh` antes de actualizar y
`scripts/restore-demo.sh` sólo con confirmación explícita. El procedimiento
completo conserva PostgreSQL y fotografías; nunca usar `prisma migrate reset`
ni `docker compose down -v` en el entorno publicado.

## Seguridad y bloqueos

- No se versionan `.env`, uploads, logs ni secretos.
- El registro público requiere configuración explícita y segura; sin ella debe
  permanecer deshabilitado.
- JWT, refresh tokens, CORS y límites de fotos deben ser valores de entorno.
- La candidata aún requiere validación responsive exacta con Playwright o una
  herramienta que permita fijar `390x844` y `1440x900`.
- No se hizo deploy público.

Los resultados ejecutados y sus límites están en
`docs/VALIDACION_FASE6A.md`.
