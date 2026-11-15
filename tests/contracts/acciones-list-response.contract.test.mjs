import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeAccionesResponse } from '../../web/src/api/normalize-acciones-response.ts';
const actionsPage = await readFile('web/src/pages/acciones/AccionesPage.tsx', 'utf8');

const action = { id: 'accion-1' };

test('normalizes the backend array response', () => {
  assert.deepEqual(normalizeAccionesResponse([action]), { data: [action], total: 1, isPaginated: false });
  assert.deepEqual(normalizeAccionesResponse([]), { data: [], total: 0, isPaginated: false });
});

test('preserves the paginated response format', () => {
  assert.deepEqual(normalizeAccionesResponse({ data: [action], total: 12 }), {
    data: [action],
    total: 12,
    isPaginated: true,
  });
});

test('marks a complete array so the grid can paginate pages 1 and 2 locally', () => {
  const complete = Array.from({ length: 25 }, (_, index) => ({ id: `accion-${index + 1}` }));
  const result = normalizeAccionesResponse(complete);
  assert.equal(result.isPaginated, false);
  assert.equal(result.total, 25);
  assert.deepEqual(result.data.slice(0, 10).map((item) => item.id), Array.from({ length: 10 }, (_, index) => `accion-${index + 1}`));
  assert.deepEqual(result.data.slice(10, 20).map((item) => item.id), Array.from({ length: 10 }, (_, index) => `accion-${index + 11}`));
});

test('switches the grid to client pagination only for complete arrays and keeps the status filter', () => {
  assert.match(actionsPage, /paginationMode=\{isClientPaginated \? 'client' : 'server'\}/);
  assert.match(actionsPage, /estado: estadoFilter/);
});
