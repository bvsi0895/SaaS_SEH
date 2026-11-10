# Matriz de permisos multiempresa

La autorización siempre se evalúa sobre una combinación concreta de
`OrganizacionMiembro` + `OrganizacionEmpresa` + `AccesoEmpresa`. El hecho de
que dos organizaciones estén vinculadas con la misma empresa no concede
acceso cruzado.

| Capacidad | OWNER / ADMIN_ORG | AUDITOR_ORG | ADMIN_EMPRESA | SUPERVISOR | TECNICO |
|---|---:|---:|---:|---:|---:|
| Administrar organización | Sí, sólo su organización | No | No | No | No |
| Crear o revocar vínculos empresa–organización | Sí, según política | No | No | No | No |
| Gestionar membresías de su organización | Sí | No | No | No | No |
| Gestionar accesos de su organización | Sí | No | No | No | No |
| Gestionar establecimientos del vínculo autorizado | Sí* | Sólo lectura* | Sí* | No | No |
| Gestionar checklists privados del vínculo | Sí* | Sólo lectura* | Sí* | No | No |
| Crear inspecciones | Sí* | No | Sí* | Sí* | Sí* |
| Registrar respuestas | Sí* | No | Sí* | Sí* | Sí* |
| Crear hallazgos | Sí* | No | Sí* | Sí* | Sí* |
| Gestionar acciones correctivas | Sí* | Sólo lectura* | Sí* | Sí* | No |
| Ver expedientes e informes | Sí* | Sólo lectura* | Sí* | Sí* | Sí* |
| Auditar varias empresas de su organización | Sí, según accesos | Sí, según accesos | No | No | No |

`Sí*` requiere, sin excepción:

- membresía activa del usuario en la organización;
- relación `OrganizacionEmpresa` activa;
- `AccesoEmpresa` explícito y activo;
- `AccesoEstablecimiento` activo si el recurso está restringido a un
  establecimiento;
- coincidencia del `organizacionEmpresaId` del recurso.

Reglas adicionales:

- `OWNER` y `ADMIN_ORG` no reciben acceso implícito a todos los datos de una
  empresa por pertenecer a una organización; deben operar sobre vínculos
  activos de esa organización.
- `ADMIN_EMPRESA` es un rol operativo del vínculo, no un administrador global
  de la empresa compartida.
- Un usuario de la consultora A no puede leer, modificar ni descargar un
  expediente creado bajo el vínculo de la consultora B aunque ambas trabajen
  para la misma `Empresa`.
- Los endpoints no aceptan un rol, organización o empresa como autoridad desde
  el frontend. El backend determina la autorización desde la sesión y las
  relaciones persistidas.
- Las respuestas, búsquedas, reportes y archivos se filtran por ámbito antes
  de serializarse o servirse.

## Consulta de expedientes de una empresa

La interfaz puede mostrar los vínculos autorizados de una empresa, pero cada
selección activa un contexto concreto. La consulta equivalente debe ser:

```text
empresaId → vínculos OrganizacionEmpresa autorizados del usuario
          → selección explícita de un vínculo
          → expedientes filtrados por organizacionEmpresaId
```

No existe una consulta global `WHERE empresaId = ?` para datos privados.
