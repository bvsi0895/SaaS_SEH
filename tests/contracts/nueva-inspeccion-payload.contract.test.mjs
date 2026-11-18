import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = () => readFile(new URL('../../web/src/pages/inspecciones/NuevaInspeccionPage.tsx', import.meta.url), 'utf8');

test('omits empty scheduled date and assignee from the create payload', async () => {
  const source = await read();
  assert.match(source, /const \{ fechaProgramada, asignadoAId, \.\.\.requiredFields \} = data/);
  assert.match(source, /fechaProgramada\?\.trim\(\)/);
  assert.match(source, /normalizedAssignee \? \{ asignadoAId: normalizedAssignee \} : \{\}/);
  assert.match(source, /createMutation\.mutate\(payload\)/);
});

test('serializes a selected scheduled date as ISO 8601', async () => {
  const source = await read();
  assert.match(source, /new Date\(`\$\{fechaProgramada\}T00:00:00\.000Z`\)\.toISOString\(\)/);
});

test('preserves the remaining inspection fields while normalizing optional values', async () => {
  const source = await read();
  assert.match(source, /const payload: CreateInspeccionDto = \{\s*\.\.\.requiredFields,/s);
  assert.match(source, /const normalizedAssignee = asignadoAId\?\.trim\(\);/);
});

