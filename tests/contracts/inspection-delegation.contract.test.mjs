import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('inspection delegation schema keeps the legacy owner and adds explicit responsibility', async () => {
  const schema = await read('backend/prisma/schema.prisma');
  assert.match(schema, /enum EstadoInspeccion \{\s+PENDIENTE/);
  assert.match(schema, /creadoPorId String/);
  assert.match(schema, /asignadoAId String/);
  assert.match(schema, /fechaProgramada DateTime\?/);
  assert.match(schema, /usuarioId String\s+usuario\s+Usuario @relation\("InspeccionUsuarioLegacy"/);
  assert.match(schema, /model InspeccionReasignacion/);
});

test('delegation migration backfills both owners before making them required', async () => {
  const migration = await read('backend/prisma/migrations/20261117100000_inspection_delegation/migration.sql');
  assert.match(migration, /ADD COLUMN "creadoPorId" TEXT/);
  assert.match(migration, /ADD COLUMN "asignadoAId" TEXT/);
  assert.match(migration, /SET "creadoPorId" = "usuarioId",\s+"asignadoAId" = "usuarioId"/);
  assert.match(migration, /ALTER COLUMN "creadoPorId" SET NOT NULL/);
  assert.match(migration, /ALTER COLUMN "asignadoAId" SET NOT NULL/);
  assert.match(migration, /CREATE TABLE "inspeccion_reasignaciones"/);
});

test('delegation API exposes pending start and reassignment operations', async () => {
  const [controller, api, page] = await Promise.all([
    read('backend/src/inspecciones/inspecciones.controller.ts'),
    read('web/src/api/inspecciones.ts'),
    read('web/src/pages/inspecciones/NuevaInspeccionPage.tsx'),
  ]);
  assert.match(controller, /@Post\(':id\/iniciar'\)/);
  assert.match(controller, /@Post\(':id\/reasignar'\)/);
  assert.match(api, /`\/inspecciones\/\$\{id\}\/iniciar`/);
  assert.match(api, /`\/inspecciones\/\$\{id\}\/reasignar`/);
  assert.match(page, /Crear y asignar/);
  assert.match(page, /Iniciar inspección/);
});

