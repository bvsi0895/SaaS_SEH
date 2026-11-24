# Preparación de demo pública SEH

## Alcance

Esta guía corresponde a `feature/demo-deployment`, basada en
`feature/demo-online` después de los merges de PR #28 y PR #29. Prepara un
Compose reproducible, pero no ejecuta despliegues ni modifica servidores.

El único punto de entrada público es el Caddy existente del VPS. Caddy termina
HTTPS y reenvía al contenedor `seh-web`; Nginx sirve la SPA y reenvía `/api`
al backend dentro de la red Docker. PostgreSQL no publica ningún puerto al
host. El Caddy incluido en Compose queda en el perfil opcional
`bundled-caddy` y no debe activarse cuando ya existe `seh-caddy`.

## Requisitos del VPS

- VM/VPS exclusivo o con aislamiento operativo claro.
- 2 vCPU, 4 GB de RAM y 40 GB SSD iniciales.
- Linux LTS, Docker Engine y Docker Compose v2.
- DNS de `seh-demo.creativewebsite.com.ar` apuntando al VPS; 80/443 ya son
  propiedad del Caddy existente.
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
   docker compose --env-file .env build backend web
   ```

4. Iniciar sólo después de revisar la configuración:

   ```bash
   docker compose --env-file .env up -d --build postgres backend web
   docker compose --env-file .env ps
   ```

En el VPS de demo usar el proyecto Compose con nombre `seh`, conservar los
contenedores `seh-caddy`, `seh-postgres`, `seh-backend` y `seh-web`, y no activar
`COMPOSE_PROFILES=bundled-caddy`. El servicio Caddy opcional sólo sirve para una
instalación nueva sin proxy TLS existente:

```bash
COMPOSE_PROFILES=bundled-caddy docker compose --env-file .env up -d --build
```

No ejecutar ese perfil en el VPS que ya tiene `seh-caddy`: evita el conflicto
de nombre y conserva el contenedor y volumen de certificados existentes.

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

En el VPS informado hay 11 migraciones aplicadas. Antes de una actualización:
crear un backup, identificar el commit anterior, actualizar el código y
ejecutar `config --quiet`, `build` y `up -d postgres backend web`. El backend
aplicará sólo las migraciones pendientes, en orden, mediante
`prisma migrate deploy`. Confirmar healthchecks, login, cambio de contexto,
aislamiento, fotografías y PDF.

Para rollback de aplicación, volver al commit o imágenes anteriores y ejecutar
`up -d`; no eliminar volúmenes. Si se requiere restaurar datos, seguir el
procedimiento de restauración y volver a comprobar la versión de migraciones.
Nunca usar `docker compose down -v` como rollback.

## Backups y restauración

El backup incluye el dump PostgreSQL en formato custom, fotografías y hashes.
El archivo de fotografías se genera por stdout desde el contenedor UID 1001,
por lo que el host escribe el archivo y no se produce un fallo de permisos en
el bind mount:

```bash
bash scripts/backup-demo.sh
```

La restauración es destructiva y exige confirmación explícita:

```bash
CONFIRM_RESTORE=YES bash scripts/restore-demo.sh backups/20260101T000000Z
```

La restauración verifica `SHA256SUMS` con rutas relativas, restaura primero el
dump y las fotografías, y ejecuta luego `prisma migrate deploy`. Así un dump
con 11 migraciones vuelve primero a ese estado histórico y después recibe las
migraciones nuevas. El script no detiene ni recrea `seh-caddy`.

Ensayar la restauración en un entorno aislado antes de usarla. Mantener al
menos tres copias, una fuera del VPS, y proteger el acceso a los archivos de
backup. Los scripts no imprimen secretos ni eliminan volúmenes Docker.

## Configuración de red y secretos

- Sólo el Caddy existente (`seh-caddy`) publica 80/443.
- `web` y `backend` usan `expose` y la red interna `seh-network`.
- PostgreSQL no tiene `ports` y sólo es accesible por los servicios Compose.
- Los archivos `.env`, uploads, logs y backups están excluidos de Git.
- El dominio `seh-demo.creativewebsite.com.ar` y el certificado pertenecen al
  Caddy existente; no mover ni recrear su volumen de certificados.

## Riesgos pendientes

- La demo usa almacenamiento local de un solo nodo para fotografías.
- El Caddy existente debe estar conectado a la red Docker donde resuelve
  `seh-web:80`; verificarlo antes de actualizar, sin reiniciarlo ni recrearlo.
- Los backups son responsabilidad operativa; deben verificarse con una
  restauración periódica.
- `JWT_EXPIRATION=15m` reduce la ventana de access tokens, mientras refresh
  tokens y la revocación existente conservan su comportamiento.
- Esta rama no fue desplegada ni probada contra datos productivos.
