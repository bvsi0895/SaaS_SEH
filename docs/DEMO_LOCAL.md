# Ejecutar la demo local

Requisitos: Node.js, pnpm, Docker Desktop y PostgreSQL local del compose de
SEH.

```powershell
cd D:\Proyectos\SEH
docker compose -f docker-compose.dev.yml up -d postgres
pnpm install --frozen-lockfile
pnpm --filter seh-backend exec prisma migrate deploy
pnpm --filter seh-backend prisma:seed
pnpm --filter seh-backend build
pnpm --filter seh-backend start:prod
```

La API queda en `http://localhost:3000`; Swagger en
`http://localhost:3000/api/docs`. Para el recorrido se utiliza un usuario
ficticio creado por el seed. Las credenciales se mantienen sólo en el entorno
local y no se documentan como secretos compartibles.

El recorrido consiste en iniciar sesión, listar o crear un checklist válido,
crear una inspección, registrar respuestas, crear un hallazgo, crear su acción
correctiva con un usuario autorizado, finalizar y descargar el PDF.

Las fotografías se envían como `multipart/form-data` en el campo `file` a
`POST /api/hallazgos/:id/fotos`. Se aceptan JPG, PNG y WEBP hasta 5 MiB. La
descarga requiere JWT y sólo permite evidencias de la empresa del usuario.

Para comprobar la calidad del código:

```powershell
pnpm --filter seh-backend build
pnpm --filter seh-web build
pnpm --filter seh-mobile exec tsc --noEmit
pnpm --filter seh-backend exec jest --runInBand
```
