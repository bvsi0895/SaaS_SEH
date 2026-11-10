# Gestión de consultoras y empresas-clientes

## Alcance

La administración de Fase 4 opera dentro del contexto activo y no sustituye
la autorización backend. El frontend sólo conserva la preferencia de contexto;
cada endpoint vuelve a validar `OrganizacionMiembro`, `OrganizacionEmpresa` y
`AccesoEmpresa`.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET/PATCH | `/api/organizaciones/me` | Datos de organización y datos comerciales |
| GET/POST | `/api/organizaciones/me/miembros` | Consultar e incorporar usuarios existentes |
| PATCH | `/api/organizaciones/me/miembros/:id` | Cambiar rol permitido |
| POST | `/api/organizaciones/me/miembros/:id/revocar` | Revocar membresía y accesos |
| GET/POST | `/api/organizaciones/me/empresas` | Listar o crear empresas-clientes |
| POST | `/api/organizaciones/me/empresas/vincular` | Vincular una empresa existente por ID autorizado |
| PATCH | `/api/organizaciones/me/empresas/:id` | Activar, suspender o revocar relación |
| PATCH | `/api/organizaciones/me/empresas/:id/datos` | Editar datos comerciales de la empresa |
| GET/POST | `/api/organizaciones/me/empresas/:id/establecimientos` | Listar y crear establecimientos |
| PATCH | `/api/organizaciones/me/empresas/:id/establecimientos/:id` | Editar o desactivar sin borrado destructivo |
| GET/POST | `/api/organizaciones/me/empresas/:id/asignaciones` | Consultar y asignar accesos efectivos |
| POST | `/api/organizaciones/me/empresas/:id/asignaciones/:id/revocar` | Revocar acceso operativo |

## Roles

- `OWNER`: administración completa de la organización.
- `ADMIN_ORGANIZACION`: administración operativa; no puede crear otro owner.
- `AUDITOR_ORGANIZACION`: acceso operativo según asignaciones, sin administración.
- `AccesoEmpresa.rol`: rol operativo (`ADMIN_EMPRESA`, `SUPERVISOR` o `TECNICO`) para una relación concreta.

La incorporación administrativa requiere que el usuario ya exista. No existe
alta pública de membresías ni se aceptan roles privilegiados desde el registro.
Las revocaciones son soft-revoke: se desactivan membresías o accesos y no se
borra el historial.

## Interfaz

La ruta `/administracion` contiene cuatro secciones responsive:

1. Organización y datos de contacto/logo por URL.
2. Empresas-clientes: alta, vinculación existente, edición y estado de relación.
3. Establecimientos: alta, edición, sectores y activación/desactivación.
4. Técnicos y accesos: incorporación de miembros, asignaciones y permisos efectivos.

## Limitaciones conocidas

- La invitación por correo todavía requiere que el usuario exista; no se envían correos ni se crean membresías públicas.
- El logo se configura como URL segura; no se implementó almacenamiento de logos en esta fase.
- La entidad física `Empresa` puede estar vinculada a varias organizaciones, pero sus expedientes operativos permanecen bajo `organizacionEmpresaId`.
