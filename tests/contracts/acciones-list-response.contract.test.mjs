import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAccionesResponse } from '../../web/src/api/normalize-acciones-response.ts';

const action = { id: 'accion-1' };

test('normalizes the backend array response', () => {
  assert.deepEqual(normalizeAccionesResponse([action]), { data: [action], total: 1 });
  assert.deepEqual(normalizeAccionesResponse([]), { data: [], total: 0 });
});

test('preserves the paginated response format', () => {
  assert.deepEqual(normalizeAccionesResponse({ data: [action], total: 12 }), {
    data: [action],
    total: 12,
  });
});
