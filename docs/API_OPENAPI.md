# API OpenAPI — demo SEH

La API usa el prefijo global `/api`.

- Swagger UI: `http://localhost:3000/api/docs`
- Documento OpenAPI: `http://localhost:3000/api/docs-json`
- Autenticación: `Authorization: Bearer <accessToken>`

## Recorrido funcional

| Paso | Método | Ruta |
|---|---|---|
| Login | POST | `/api/auth/login` |
| Perfil autenticado | GET | `/api/auth/me` |
| Listar checklists | GET | `/api/checklists` |
| Crear inspección | POST | `/api/inspecciones` |
| Registrar respuesta | PATCH | `/api/inspecciones/:id/item` |
| Crear hallazgo | POST | `/api/hallazgos` |
| Crear acción correctiva | POST | `/api/acciones-correctivas` |
| Finalizar inspección | POST | `/api/inspecciones/:id/finalizar` |
| Ver PDF | GET | `/api/reportes/inspecciones/:id/pdf` |
| Descargar PDF | GET | `/api/reportes/inspecciones/:id/pdf/download` |

Los payloads y respuestas completos se generan desde los DTOs NestJS y se exponen en Swagger. La demo requiere PostgreSQL local y datos creados mediante `pnpm --filter seh-backend prisma:seed`.
