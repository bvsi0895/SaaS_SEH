import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("PR35 define el plano comercial y la migración compatible", async () => {
  const [schema, migration] = await Promise.all([
    read("backend/prisma/schema.prisma"),
    read("backend/prisma/migrations/20261126120000_add_saas_control_plane/migration.sql"),
  ]);
  assert.match(schema, /model PlanSaaS/);
  assert.match(schema, /model SuscripcionSaaS/);
  assert.match(schema, /model AuditoriaSuscripcionSaaS/);
  assert.match(schema, /model AdministradorSaaS/);
  assert.match(migration, /LEGACY_COMPAT/);
  assert.match(migration, /ON CONFLICT \("organizacionId"\) DO NOTHING/);
  assert.match(migration, /sin modificar ni eliminar entidades operativas/);
});

test("PR35 mantiene el administrador SaaS separado de OWNER y expone estados protegidos", async () => {
  const [guard, controller, service] = await Promise.all([
    read("backend/src/saas/saas-admin.guard.ts"),
    read("backend/src/saas/saas.controller.ts"),
    read("backend/src/saas/saas-commercial.service.ts"),
  ]);
  assert.match(guard, /administradorSaaS/);
  assert.doesNotMatch(guard, /RolOrganizacion\.OWNER/);
  assert.match(controller, /organizaciones\/:id\/activar/);
  assert.match(controller, /organizaciones\/:id\/suspender/);
  assert.match(controller, /organizaciones\/:id\/cancelar/);
  assert.match(controller, /organizaciones\/:id\/prueba/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /assertOperationalAccess/);
});

test("PR35 deja definido el contrato que consumirá el panel SaaS", async () => {
  const docs = await read("docs/SAAS-CONTROL-PLANE.md");
  assert.match(docs, /GET \/api\/saas\/admin\/organizaciones/);
  assert.match(docs, /GET \/api\/saas\/admin\/organizaciones\/:id\/auditoria/);
  assert.match(docs, /LEGACY_COMPAT/);
});

