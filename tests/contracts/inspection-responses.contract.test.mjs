import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile('web/src/pages/inspecciones/InspeccionDetailPage.tsx', 'utf8');
const api = await readFile('web/src/api/inspecciones.ts', 'utf8');

test('inspection response UI exposes the four accessible states and separates metrics', () => {
  for (const label of ['Cumple', 'No cumple', 'Con observaciones', 'No aplica']) {
    assert.match(page, new RegExp(`title="${label}"`));
    assert.match(page, new RegExp(`aria-label="${label}"`));
  }
  assert.match(page, /Progreso de respuestas/);
  assert.match(page, /Nivel de cumplimiento/);
});

test('NO_CUMPLE links the response flow to an inspection item finding', () => {
  assert.match(page, /handleNoCumple/);
  assert.match(page, /inspeccionItemId/);
  assert.match(page, /openHallazgoForItem/);
});

test('the API keeps the backend PATCH contract for item responses', () => {
  assert.match(api, /apiClient\.patch[\s\S]*`\/inspecciones\/\$\{inspeccionId\}\/item`/);
});
