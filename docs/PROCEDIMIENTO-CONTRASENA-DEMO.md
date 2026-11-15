# Procedimiento administrativo: contraseña inicial de la demo

Este procedimiento es manual e independiente del despliegue. No debe agregarse la contraseña al repositorio, a un archivo `.env` versionado, a logs ni a scripts de seed.

## Usuarios ficticios

La semilla demo crea estos cuatro usuarios:

- `admin.demo@seh.local`
- `supervisor.demo@seh.local`
- `tecnico.norte@seh.local`
- `tecnico.sur@seh.local`

La contraseña inicial se define sólo durante la operación administrativa. Debe tener al menos 8 caracteres, mayúscula, minúscula, número y carácter especial.

## Procedimiento seguro

1. Generar una contraseña temporal aleatoria fuera del repositorio y cargarla en una variable de entorno de la sesión administrativa:

   ```bash
   read -rsp 'Contraseña inicial temporal: ' DEMO_INITIAL_PASSWORD
   echo
   ```

2. Iniciar sesión como administrador demo mediante `POST /api/auth/login` usando las credenciales entregadas por el responsable de la demo. No guardar la respuesta en archivos ni logs.

3. Consultar `GET /api/auth/contextos` y conservar sólo en memoria los `organizacionEmpresaId` necesarios para las empresas demo.

4. Para cada usuario, llamar a `PATCH /api/usuarios/:id/password` con el token del administrador y el header `X-Organizacion-Empresa-Id` del contexto de la empresa correspondiente:

   ```bash
   curl -fsS -X PATCH "$SEH_API/api/usuarios/$USER_ID/password" \
     -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
     -H "X-Organizacion-Empresa-Id: $ORGANIZACION_EMPRESA_ID" \
     -H 'Content-Type: application/json' \
     --data "{\"newPassword\":\"$DEMO_INITIAL_PASSWORD\"}"
   ```

   El usuario administrador debe operar en el contexto autorizado de cada empresa. `tecnico.norte@seh.local` pertenece a la empresa Norte y `tecnico.sur@seh.local` a la empresa Sur.

5. Probar el inicio de sesión de cada usuario y entregar la contraseña sólo por el canal seguro definido para la demostración.

6. Eliminar la variable de la sesión y cerrar sesión administrativa:

   ```bash
   unset DEMO_INITIAL_PASSWORD ADMIN_ACCESS_TOKEN SEH_API
   ```

Este procedimiento no cambia contraseñas automáticamente durante el despliegue y no requiere migraciones.
