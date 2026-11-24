# Preparación de demo pública SEH

## Alcance

Esta guía corresponde a `feature/demo-deployment`, basada en
`feature/demo-online` después de los merges de PR #28 y PR #29. Prepara un
Compose reproducible, pero no ejecuta despliegues ni modifica servidores.

El único punto de entrada público es Caddy. Caddy termina HTTPS y reenvía al
servicio `web`; Nginx sirve la SPA y reenvía `/api` al backend dentro de la
red Docker. PostgreSQL no publica ningún puerto al host.

## Requisitos del VPS

- VM/VPS exclusivo o con aislamiento operativo claro.
- 2 vCPU, 4 GB de RAM y 40 GB SSD iniciales.
- Linux LTS, Docker Engine y Docker Compose v2.
- DNS del dominio apuntando al VPS y puertos TCP 80/443 disponibles para Caddy.
- Backups fuera del VPS y espacio adicional para fotografías y restauraciones.

No reutilizar volúmenes, `.env` ni datos de otra instalación. Para más
usuarios, fotografías o generación intensiva de PDF se debe medir antes de
escalar.

## Instalación controlada

1. Copiar el repositorio en un directorio exclusivo y revisar el commit aprobado.
2. Crear `.env` sin versionarlo:

   ```bash
   cp deploy/demo.env.example .env
   openssl rand -base64 48
   ```

   Usar valores distintos para `POSTGRES_PASSWORD`, `JWT_SECRET` y
   `JWT_REFRESH_SECRET`. Reemplazar `DOMAIN` y `CORS_ORIGIN` por el dominio
   real; conservar `VITE_API_URL=/api`, `JWT_EXPIRATION=15m` y
   `ENABLE_SWAGGER=false` para la demo.

3. Validar sin iniciar contenedores:

   ```bash
   docker compose --env-file .env config --quiet
   docker compose --env-file .env build backend web caddy
   ```

4. Iniciar sólo después de revisar la configuración:

   ```bash
   docker compose --env-file .env up -d --build
   docker compose --env-file .env ps
   ```

El backend ejecuta `prisma migrate deploy` al arrancar. No usar
`prisma migrate reset` en la demo.

## Health checks y operación

```bash
docker compose --env-file .env ps
docker compose --env-file .env exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"
curl -fsS https://$DOMAIN/api/health
curl -fsS https://$DOMAIN/health
```

El endpoint `/api/docs` queda deshabilitado en producción salvo que se active
explícitamente `ENABLE_SWAGGER=true`; no activarlo en el dominio público.

Las fotografías persisten en `seh_uploads` y PostgreSQL en `postgres_data`.
No publicar esos volúmenes ni montarlos como contenido estático.

## Migraciones, actualizaciones y rollback

Para revisar migraciones pendientes:

```bash
docker compose --env-file .env run --rm --no-deps backend ./node_modules/.bin/prisma migrate status
```

Antes de una actualización: crear un backup, identificar el commit anterior,
actualizar el código y ejecutar `config --quiet`, `build` y `up -d`. Confirmar
healthchecks, login, cambio de contexto, aislamiento, fotografías y PDF.

Para rollback de aplicación, volver al commit o imágenes anteriores y ejecutar
`up -d`; no eliminar volúmenes. Si se requiere restaurar datos, seguir el
procedimiento de restauración y volver a comprobar la versión de migraciones.
Nunca usar `docker compose down -v` como rollback.

## Backups y restauración

El backup incluye el dump PostgreSQL en formato custom, fotografías y hashes:

```bash
bash scripts/backup-demo.sh
```

La restauración es destructiva y exige confirmación explícita:

```bash
CONFIRM_RESTORE=YES bash scripts/restore-demo.sh backups/20260101T000000Z
```

Ensayar la restauración en un entorno aislado antes de usarla. Mantener al
menos tres copias, una fuera del VPS, y proteger el acceso a los archivos de
backup. Los scripts no imprimen secretos ni eliminan volúmenes Docker.

## Configuración de red y secretos

- Sólo Caddy publica 80/443.
- `web` y `backend` usan `expose` y la red interna `seh-network`.
- PostgreSQL no tiene `ports` y sólo es accesible por los servicios Compose.
- Los archivos `.env`, uploads, logs y backups están excluidos de Git.
- El dominio debe tener DNS correcto antes de iniciar Caddy para que pueda
  obtener el certificado TLS.

## Riesgos pendientes

- La demo usa almacenamiento local de un solo nodo para fotografías.
- Caddy requiere DNS y puertos 80/443 libres; si existe un proxy compartido,
  debe elegirse explícitamente una única terminación TLS antes de desplegar.
- Los backups son responsabilidad operativa; deben verificarse con una
  restauración periódica.
- `JWT_EXPIRATION=15m` reduce la ventana de access tokens, mientras refresh
  tokens y la revocación existente conservan su comportamiento.
- Esta rama no fue desplegada ni probada contra datos productivos.
