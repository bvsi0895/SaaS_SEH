# Matriz de permisos multiempresa propuesta

La autorización combina rol de organización con acceso explícito a empresa y,
cuando corresponda, establecimiento.

| Capacidad | OWNER | ADMIN_ORG | ADMIN_EMPRESA | SUPERVISOR | TECNICO | AUDITOR_ORG |
|---|---:|---:|---:|---:|---:|---:|
| Administrar organización | Sí | Sí | No | No | No | No |
| Alta/baja de empresas | Sí | Sí | No | No | No | No |
| Gestionar membresías org. | Sí | Sí | No | No | No | No |
| Gestionar usuarios empresa | Sí* | Sí* | Sí | No | No | No |
| Gestionar establecimientos | Sí* | Sí* | Sí | No | No | No |
| Gestionar checklists | Sí* | Sí* | Sí | No | No | No |
| Crear inspecciones | Sí* | Sí* | Sí | Sí | Sí | No |
| Registrar respuestas | Sí* | Sí* | Sí | Sí | Sí | No |
| Crear hallazgos | Sí* | Sí* | Sí | Sí | Sí | No |
| Gestionar acciones | Sí* | Sí* | Sí | Sí | No | No |
| Ver reportes empresa | Sí* | Sí* | Sí | Sí | Según acceso | Sólo lectura |
| Auditar varias empresas | Según acceso | Según acceso | No | No | No | Sí |

`Sí*` exige una relación `AccesoEmpresa` activa. Ningún rol obtiene acceso
implícito a todos los clientes de una consultora salvo una política aprobada.

Reglas: `OWNER` sólo uno por organización en la primera versión;
`ADMIN_ORGANIZACION` no sustituye el rol operativo; `ADMIN_EMPRESA` no puede
administrar otra empresa sin acceso explícito; `AUDITOR_ORGANIZACION` es sólo
lectura.
