# Infraestructura recomendada — Demo privada SEH

## Alcance y estado

Este documento prepara una decisión de infraestructura para la demo privada de
SEH. La revisión se realizó sólo sobre `D:\Proyectos\SEH`, rama
`feature/demo-online`, commit `850ce46`. No se accedió a Oracle Cloud, no se
modificaron servidores y no se ejecutó ningún despliegue.

La configuración actual usa PostgreSQL 16, backend NestJS, frontend Nginx y
volúmenes Docker persistentes. PostgreSQL y backend no publican puertos al
host; web se enlaza a `127.0.0.1:8080` para que un proxy HTTPS existente pueda
servir el dominio.

## Recomendación ejecutiva

Para una demo privada de 3 a 5 usuarios simultáneos, la opción preferida es
una VM dedicada o un VPS independiente:

- 2 vCPU dedicadas o compartidas con baja sobreventa.
- 4 GB de RAM.
- 40 GB SSD como capacidad inicial recomendada; 20 GB es el mínimo técnico.
- Ubuntu LTS o distribución equivalente con Docker Engine y Compose plugin.
- Swap de 2 GB como red de seguridad, sin usarla como memoria operativa.
- Un dominio o subdominio propio y TLS terminado por Caddy/Nginx.
- Backups externos de PostgreSQL y evidencias.

Una VM existente sólo es aceptable si cumple los límites de coexistencia de
este documento y tiene margen medido, no sólo capacidad nominal.

## Estimación de consumo

| Recurso | Reserva inicial | Comentario |
|---|---:|---|
| CPU | 2 vCPU | Suficiente para demo; PDF y builds no deben ejecutarse simultáneamente en producción. |
| RAM | 4 GB | PostgreSQL 768 MiB, backend 512 MiB, web 256 MiB; resto para Docker y sistema. |
| Sistema/imágenes | 10 GB | Ubuntu, Docker, capas y actualizaciones. |
| PostgreSQL | 5 GB iniciales | Datos ficticios, índices y margen operativo. |
| Evidencias | 5–10 GB iniciales | Depende del tamaño y retención de fotografías. |
| Backups | 10 GB externos | Tres copias como mínimo; no almacenarlas sólo en la VM. |
| Logs | 90 MB máximo configurado | Rotación de 3 archivos de 10 MB por servicio principal. |

Para más de 5 usuarios concurrentes, generación intensiva de informes o
fotografías abundantes se debe medir antes de escalar. No se recomienda
compartir el almacenamiento de evidencias con otros sistemas.

## Requisitos por componente

### PostgreSQL

- PostgreSQL 16 compatible con el Compose actual.
- Volumen persistente `postgres_data` en SSD.
- Sin publicación de `5432` al host ni a Internet.
- Contraseña única y secreta fuera de Git.
- `pg_isready` como healthcheck.
- Backup diario con `pg_dump -Fc`, retención mínima de tres copias y una copia
  fuera de la VM.
- Ensayo de restauración en una base o contenedor distinto antes de cualquier
  actualización.

### Evidencias

- Volumen `seh_uploads` persistente y separado de PostgreSQL.
- Acceso únicamente a través del backend autenticado.
- No montar el directorio como contenido estático de Nginx.
- Para esta demo: almacenamiento local de un nodo.
- Para disponibilidad o múltiples réplicas: almacenamiento de objetos privado,
  cifrado y con URLs firmadas o descarga mediada por backend.

### Logs y observabilidad

- Rotación Docker activa, sin tokens, contraseñas ni cuerpos sensibles.
- Retener logs de aplicación sólo el tiempo necesario para soporte.
- Revisar healthchecks de PostgreSQL, backend y web.
- Centralizar alertas de disco, memoria, reinicios y errores 5xx si la VM ya
  dispone de monitoreo.

## Convivencia con un proxy existente

La configuración entregada presupone que Caddy o Nginx corre en el host y que
el bloque de dominio apunta a `127.0.0.1:8080`, como en
`deploy/Caddyfile.example`. Esto evita ocupar los puertos 80/443 del proxy
existente.

Procedimiento seguro:

1. Confirmar qué proceso posee 80/443 y cómo se administra actualmente.
2. Respaldar la configuración del proxy existente antes de editarla.
3. Agregar un bloque independiente para el subdominio de demo; no modificar
   bloques de otros proyectos.
4. Ejecutar la validación nativa (`caddy validate` o equivalente).
5. Recargar de forma atómica, nunca reiniciar a ciegas el proxy compartido.
6. Verificar TLS, `/api/health`, login y descarga PDF.
7. Para retirar SEH, eliminar sólo su bloque y detener sólo su Compose.

Si el proxy existente corre dentro de otro contenedor, `127.0.0.1:8080` apunta
a ese contenedor y no al host. En ese caso hay que elegir, antes del despliegue,
una red Docker compartida explícita o un endpoint del host; no se debe cambiar
la red del proxy existente sin autorización.

## Procedimiento previsto para una VM nueva

Este procedimiento es de preparación y no fue ejecutado en servidores.

1. Crear una VM o VPS dedicado con los recursos recomendados.
2. Aplicar actualizaciones del sistema y confirmar firewall, DNS y reloj.
3. Instalar Docker Engine y el plugin Compose siguiendo la documentación del
   sistema operativo.
4. Crear un directorio exclusivo, por ejemplo `/opt/seh-demo`, con permisos
   restringidos.
5. Copiar el repositorio en el commit aprobado; no reutilizar `.env` locales.
6. Crear `.env` desde `deploy/demo.env.example` fuera del control de versiones.
7. Generar secretos JWT y contraseña PostgreSQL fuera del repositorio.
8. Ejecutar `docker compose --env-file .env config --quiet`.
9. Revisar puertos, volúmenes, nombres de contenedor y recursos antes de iniciar.
10. Ejecutar `docker compose --env-file .env up -d --build` sólo cuando la VM
    haya sido aprobada.
11. Confirmar healthchecks, migraciones, seed ficticio y logs sin secretos.
12. Configurar el bloque del proxy HTTPS y validar el dominio.
13. Ejecutar el checklist posterior y registrar el primer backup.

No ejecutar estos comandos contra un Compose de otro proyecto ni usar
`docker compose down -v`.

## Diagnóstico que debe ejecutarse en el VPS

Los siguientes comandos son de sólo lectura y deben ejecutarse manualmente en
la VM autorizada. No se ejecutaron desde este workspace:

```bash
hostnamectl
date -Is
nproc
lscpu | egrep 'Model name|CPU\(s\)|Thread|Core|Socket'
free -h
swapon --show
df -hT
df -ih
docker version
docker compose version
docker info --format 'CPUs={{.NCPU}} Memory={{.MemTotal}} DockerRootDir={{.DockerRootDir}}'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker stats --no-stream
docker system df
ss -lntp
sudo systemctl --no-pager --type=service --state=running
```

No enviar salidas que contengan secretos, variables de entorno, tokens,
contraseñas o datos de otros proyectos. Para decidir sobre una VM compartida,
tomar además una muestra de `docker stats --no-stream` en horario normal y de
mayor carga.

## Riesgos de compartir infraestructura

| Riesgo | Impacto | Condición mínima |
|---|---|---|
| Competencia por RAM/CPU | Lentitud o reinicios | Margen libre sostenido; no usar swap como reserva normal. |
| Disco compartido | Falta de espacio o corrupción operativa | Cuota, alertas y backup externo; separar volumen de evidencias. |
| Puertos/proxy compartidos | Interrupción de otros sistemas | SEH sólo en loopback 8080; no tocar 80/443 sin procedimiento. |
| Docker compartido | Error de proyecto o nombres | Verificar contenedores, volúmenes y `container_name` antes de iniciar. |
| Logs mezclados | Exposición de datos o diagnóstico ambiguo | Rotación, nombres únicos y no registrar secretos. |
| Fallo de la VM | Caída simultánea | VPS independiente o aceptación formal del riesgo y backups externos. |
| Privilegios operativos | Cambios accidentales | Usuario/grupo Docker controlado y procedimiento de aprobación. |

La recomendación es una VM independiente si la máquina existente no puede
demostrar al menos 2 vCPU libres en picos, 2 GB de RAM libres sostenidos, 20 GB
SSD libres y aislamiento claro del proxy/volúmenes.

## Rollback y restauración

### Rollback de aplicación

1. Mantener la imagen/commit anterior identificado.
2. Detener sólo el Compose de SEH si la versión nueva es defectuosa.
3. Restaurar el archivo `.env` aprobado anterior sin imprimirlo.
4. Volver a la imagen o commit anterior y ejecutar sólo migraciones compatibles.
5. Verificar healthcheck, login, aislamiento, fotografía y PDF.

No eliminar volúmenes durante un rollback.

### Restauración de datos

1. Poner la demo en mantenimiento.
2. Crear una base nueva o contenedor aislado.
3. Aplicar `prisma migrate deploy`.
4. Restaurar con `pg_restore --no-owner --no-privileges`.
5. Restaurar `seh_uploads` desde la copia correspondiente.
6. Comparar conteos y probar login, acceso contextual y PDF.
7. Cambiar el endpoint sólo después de verificar la restauración.

El procedimiento detallado y el ensayo local están en
`docs/PLAN_BACKUP_RESTAURACION.md`.

## Datos requeridos de Oracle Cloud

Para decidir entre la VM existente y un VPS independiente necesitamos sólo
información de capacidad y operación, no credenciales:

- Región, sistema operativo y versión.
- Shape: OCPU, RAM y posibilidad de burst.
- Espacio total/libre del boot volume y discos adicionales; tipo de disco.
- Uso real de CPU, RAM, swap y disco en horario normal y pico.
- Versión de Docker/Compose instalada y `DockerRootDir`.
- Contenedores activos, puertos publicados, redes y volúmenes existentes,
  identificando propietarios sin copiar secretos.
- Proceso que atiende 80/443 y si Caddy/Nginx corre en host o contenedor.
- Reglas de firewall, security lists, NSG y puertos permitidos.
- IP pública, DNS disponible y método de gestión de certificados TLS.
- Política de snapshots, backups, retención y ubicación externa.
- Acceso operativo disponible para crear un directorio y un servicio aislado,
  sin modificar otros proyectos.
- Límites de cuota, egress y costos esperados.

Con esos datos se puede emitir una decisión objetiva: VM existente con
aislamiento y margen comprobados, o VPS independiente para reducir riesgo de
interferencia. No se necesitan claves SSH, contraseñas, tokens, secretos JWT ni
credenciales de Oracle para esta evaluación.
