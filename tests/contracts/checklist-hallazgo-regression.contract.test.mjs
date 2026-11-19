import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile('web/src/pages/inspecciones/InspeccionDetailPage.tsx', 'utf8');
const api = await readFile('web/src/api/hallazgos.ts', 'utf8');
const service = await readFile('backend/src/hallazgos/hallazgos.service.ts', 'utf8');
const integration = await readFile('backend/integration/hallazgos-checklist-postgres.integration.ts', 'utf8');
const schema = await readFile('backend/prisma/schema.prisma', 'utf8');

test('checklist editing sends only the update DTO fields', () => {
  const helper = page.match(/export function buildHallazgoUpdateData[\s\S]*?\r?\n}\r?\n/);
  assert.ok(helper, 'the update payload helper must remain explicit');
  assert.doesNotMatch(helper[0], /inspeccionId|inspeccionItemId/);
  assert.match(page, /const data = buildHallazgoUpdateData\(nuevoHallazgo\)/);
  assert.match(page, /actualizarHallazgoMutation\.mutate\(\{ id: editingHallazgoId, data \}\)/);
  assert.match(page, /inspeccionId: id!/);
  assert.match(page, /inspeccionItemId: hallazgoOriginItemId \|\| nuevoHallazgo\.inspeccionItemId/);
});

test('checklist save keeps the form open and reports backend errors', () => {
  const updateMutation = page.match(/const actualizarHallazgoMutation = useMutation\(\{[\s\S]*?\n  \}\);/);
  assert.ok(updateMutation);
  assert.match(updateMutation[0], /onError: \(error\)/);
  assert.match(updateMutation[0], /setHallazgoSaveError\(message\)/);
  assert.doesNotMatch(updateMutation[0], /finalizarCreacionHallazgo\(\)/);
  assert.match(page, /\{hallazgoSaveError && \(/);
});

test('photo and corrective-action flows remain available for existing findings', () => {
  assert.match(page, /subirFotoMutation\.mutate\(\{[\s\S]*?file: hallazgoPhoto/);
  assert.match(page, /guardarAccionCorrectiva\(hallazgo\.id, 'Hallazgo actualizado exitosamente'\)/);
  assert.match(page, /editingAccionId/);
  assert.match(api, /apiClient\.put<Hallazgo>/);
  assert.match(api, /`\/hallazgos\/\$\{id\}`/);
});

test('backend keeps the item link unique and updates an existing linked finding', () => {
  assert.match(service, /findUnique\(\{\r?\n\s*where: \{ inspeccionItemId: createHallazgoDto\.inspeccionItemId \}/);
  assert.match(service, /return this\.update\(existing\.id/);
  assert.match(schema, /inspeccionItemId String\?\s+@unique/);
  assert.match(integration, /count\(\{ where: \{ inspeccionItemId: ids\.checklistItem \} \}\)/);
  assert.match(integration, /findings\.addPhoto/);
  assert.match(integration, /findings\.update\(created\.id/);
});
