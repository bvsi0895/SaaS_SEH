# Auditoría de seguridad — Demo SEH

## Hallazgos

| Área | Criticidad | Estado | Observación |
|---|---:|---|---|
| Aislamiento multiempresa | Crítica | Sin hallazgo abierto | Los E2E rechazan accesos cruzados y el backend valida `organizacionEmpresaId`. |
| JWT y vencimiento | Alta | Controlado | JWT valida expiración; refresh token se almacena hasheado y se invalida al cerrar sesión. |
| Revocación | Alta | Controlado | Cada request resuelve membresía/acceso activo; una sesión JWT existente pierde acceso. |
| Registro público | Alta | Controlado | Requiere UUIDs configurados por operador; el cliente no elige empresa ni rol. |
| Fotografías | Alta | Controlado | Endpoint autenticado, alcance contextual, límite 5 MiB, extensión/MIME y firma binaria. |
| PDFs | Alta | Controlado | Generación y descarga protegidas por contexto; logos locales y rutas acotadas. |
| Rate limiting | Alta | Corregido | `ThrottlerGuard` global activo; 100 solicitudes/minuto por configuración demo. |
| CORS | Alta | Controlado | Lista explícita mediante `CORS_ORIGIN`; no usar `*` con credenciales. |
| Secretos | Crítica | Sin hallazgo abierto | `.env` ignorados; ejemplos sin valores operativos. |
| Puertos Docker | Alta | Corregido | PostgreSQL/backend no se publican; web sólo en loopback para Caddy. |
| JWT en localStorage | Alta | Pendiente arquitectónico | Mitigar antes de exposición pública amplia migrando a cookies HttpOnly/SameSite o estrategia equivalente. |
| Protección distribuida | Media | Pendiente | Rate limit y almacenamiento local no comparten estado entre réplicas. |
| Almacenamiento local | Media | Pendiente | Adecuado para demo de un nodo; para alta disponibilidad usar almacenamiento de objetos privado. |
| CSP/headers completos | Media | Pendiente | Nginx tiene headers básicos; revisar CSP/HSTS con el dominio definitivo. |

No se detectaron vulnerabilidades críticas abiertas en el alcance de la demo.
Los tres riesgos pendientes requieren decisión de arquitectura o infraestructura
antes de una publicación comercial amplia.

## Controles revisados

- `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- Resolución backend del contexto; los IDs del frontend no son autoridad.
- Autorización en fotografías, PDFs, empresas, inspecciones y administración.
- CORS, expiración JWT, refresh rotation y logout.
- Validación de tipo, extensión, tamaño y firma binaria de fotos.
- Registro de demo sin secretos y sin acceso público por defecto.
