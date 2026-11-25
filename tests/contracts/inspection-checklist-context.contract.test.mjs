import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('new inspection form resets context-dependent selections and preserves the rest of the form', async () => {
  const source = await read('web/src/pages/inspecciones/NuevaInspeccionPage.tsx');

  assert.match(source, /useEffect\(\(\) => \{[\s\S]*resetField\('checklistId'\)[\s\S]*resetField\('asignadoAId'\)[\s\S]*setEstablecimientoId\(''\)/);
  assert.match(source, /\}, \[activeContextId, resetField\]\);/);
  assert.match(source, /Controller[\s\S]*name="checklistId"[\s\S]*value=\{field\.value \?\? ''\}/);
  assert.match(source, /Controller[\s\S]*name="asignadoAId"[\s\S]*value=\{field\.value \?\? ''\}/);
  assert.match(source, /const validChecklists = \(checklists \?\? \[\]\)\.filter\(\(checklist\) => isUuidV4\(checklist\.id\)\)/);
  assert.match(source, /selectedChecklist = validChecklists\.find/);
  assert.match(source, /checklistId: selectedChecklist\.id/);
  assert.match(source, /validChecklists\.some\(\(checklist\) => checklist\.id === value\)/);
});

test('demo seeds and the data repair migration use UUID v4 checklist identifiers', async () => {
  const [demoSeed, seed, migration, uuid] = await Promise.all([
    read('backend/prisma/seed.demo.ts'),
    read('backend/prisma/seed.ts'),
    read('backend/prisma/migrations/20261125120000_migrate_legacy_checklist_ids/migration.sql'),
    read('web/src/utils/uuid.ts'),
  ]);

  for (const source of [demoSeed, seed]) {
    assert.doesNotMatch(source, /demo-online-checklist-(norte|sur)|checklist-(seguridad-general|higiene-industrial|epp)/);
  }
  assert.match(migration, /'demo-online-checklist-norte' THEN '00000000-0000-4000-8000-000000000101'/);
  assert.match(migration, /'demo-online-checklist-sur' THEN '00000000-0000-4000-8000-000000000102'/);
  assert.match(migration, /'checklist-epp' THEN '00000000-0000-4000-8000-000000000113'/);
  assert.match(migration, /RAISE EXCEPTION 'Colisión de checklist legacy/);
  assert.match(uuid, /4\[0-9a-f\]\{3\}-\[89ab\]/i);
});

test('backend keeps UUID validation and organization isolation for inspection creation', async () => {
  const [dto, service, checklistService] = await Promise.all([
    read('backend/src/inspecciones/dto/create-inspeccion.dto.ts'),
    read('backend/src/inspecciones/inspecciones.service.ts'),
    read('backend/src/checklists/checklists.service.ts'),
  ]);

  assert.match(dto, /@IsUUID\('4', \{ message: 'El ID de checklist debe ser un UUID válido' \}\)/);
  assert.match(service, /if \(checklist\.empresaId !== empresaId\) throw new ForbiddenException/);
  assert.match(service, /checklist\.organizacionEmpresaId !== organizacionEmpresaId/);
  assert.match(checklistService, /empresaId,[\s\S]*\.\.\.\(organizacionEmpresaId && \{ organizacionEmpresaId \}\)/);
});
