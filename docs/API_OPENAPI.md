# API OpenAPI — demo SEH

La API NestJS usa el prefijo global `/api`.

- Swagger UI: `http://localhost:3000/api/docs`
- Documento OpenAPI: `http://localhost:3000/api/docs-json`
- Autenticación: `Authorization: Bearer <accessToken>`

## Recorrido funcional validado

| Paso | Método | Ruta |
|---|---|---|
| Login | POST | `/api/auth/login` |
| Perfil autenticado | GET | `/api/auth/me` |
| Listar checklists | GET | `/api/checklists` |
| Crear inspección | POST | `/api/inspecciones` |
| Registrar respuesta | PATCH | `/api/inspecciones/:id/item` |
| Crear hallazgo | POST | `/api/hallazgos` |
| Subir fotografía | POST multipart `file` | `/api/hallazgos/:id/fotos` |
| Descargar fotografía | GET | `/api/hallazgos/:id/fotos/:filename` |
| Crear acción correctiva | POST | `/api/acciones-correctivas` |
| Finalizar inspección | POST | `/api/inspecciones/:id/finalizar` |
| Ver PDF | GET | `/api/reportes/inspecciones/:id/pdf` |
| Descargar PDF | GET | `/api/reportes/inspecciones/:id/pdf/download` |
| Informe mensual profesional | GET | `/api/reportes/mensual.pdf?fechaDesde=<ISO>&fechaHasta=<ISO>&establecimientoId=<opcional>` |
| Establecimientos autorizados | GET | `/api/auth/establecimientos` |

Los payloads y respuestas completos se generan desde los DTOs NestJS y se
exponen en Swagger. La demo requiere PostgreSQL local, migración aplicada y
datos creados mediante `pnpm --filter seh-backend prisma:seed`.

## Contratos de seguridad

El registro público no recibe `empresaId` ni `rol`; el backend asigna la
empresa configurada por el operador y fuerza `TECNICO`. El upload acepta sólo
JPG, PNG o WEBP, con límite de 5 MiB, y las fotografías se descargan sólo con
JWT y pertenencia a la misma empresa.

El informe mensual valida además `organizacionEmpresaId` y las restricciones de
`AccesoEstablecimiento`. Los logos sólo se leen desde almacenamiento local
permitido o `data:image` acotado; no se descargan URLs remotas.
