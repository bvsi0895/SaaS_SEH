# Checklist de despliegue — Demo SEH

## Estado previo

- [x] Rama `feature/demo-online` creada sin merge.
- [x] Git limpio después de los commits de esta fase.
- [x] Datos de demo ficticios y seed idempotente.
- [x] Builds backend/web y typecheck mobile verificados.
- [x] Playwright validado en `390×844` y `1440×900`.
- [x] Backup y restauración aislada ensayados.

## Infraestructura mínima estimada

Para 3–5 usuarios simultáneos y una demo de un nodo:

- 2 vCPU compartidas.
- 4 GB RAM; PostgreSQL 768 MiB, backend 512 MiB y web 256 MiB como límites iniciales.
- 20 GB SSD iniciales: 10 GB sistema/imágenes, 5 GB base y 5 GB evidencias;
  ampliar según fotografías y retención.
- 1 dominio y DNS apuntando al proxy HTTPS.
- Backups diarios de PostgreSQL y evidencias, con al menos 3 retenciones.

## Configuración

- [ ] Copiar `deploy/demo.env.example` fuera de Git y reemplazar todos los placeholders.
- [ ] Usar secretos JWT largos, únicos y distintos.
- [ ] Configurar `CORS_ORIGIN` sólo con el dominio HTTPS real.
- [ ] Ejecutar `docker compose --env-file .env config --quiet`.
- [ ] Ejecutar `docker compose ... up -d --build` sólo en el host aprobado.
- [ ] Confirmar que PostgreSQL y backend no tienen puertos públicos.
- [ ] Configurar Caddy/Nginx con `deploy/Caddyfile.example`, HSTS y renovación TLS.
- [ ] Verificar persistencia de `postgres_data` y `seh_uploads`.
- [ ] Configurar rotación/retención y no registrar tokens, contraseñas ni cuerpos sensibles.
- [ ] Ejecutar `prisma migrate deploy` y seed sólo sobre la base de demo.

## Validación posterior

- [ ] `/api/health` responde 200.
- [ ] Login ficticio y cambio de contexto funcionan.
- [ ] Acceso cruzado entre consultoras devuelve denegación.
- [ ] Fotografía y PDF descargan sólo con autorización.
- [ ] Backup nuevo y restore de prueba quedan registrados.
- [ ] No existen `.env` reales ni datos de terceros en la imagen o repositorio.

No ejecutar este checklist contra producción ni publicar hasta resolver los
riesgos arquitectónicos documentados en `AUDITORIA_SEGURIDAD_DEMO.md`.
