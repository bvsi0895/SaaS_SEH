import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile('web/src/pages/inspecciones/InspeccionDetailPage.tsx', 'utf8');
const api = await readFile('web/src/api/inspecciones.ts', 'utf8');
const hallazgoPage = await readFile('web/src/pages/hallazgos/HallazgoDetailPage.tsx', 'utf8');
const hallazgoApi = await readFile('web/src/api/hallazgos.ts', 'utf8');
const hallazgosPage = await readFile('web/src/pages/hallazgos/HallazgosPage.tsx', 'utf8');

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

test('inspection controls keep ToggleButtons as direct group children', () => {
  assert.match(page, /<ToggleButton value="CUMPLE"[\s\S]*<Tooltip title="Cumple">/);
  assert.match(page, /<ToggleButton value="NO_CUMPLE"[\s\S]*<Tooltip title="No cumple">/);
  assert.doesNotMatch(page, /<Tooltip title="No cumple">\s*<ToggleButton/);
});

test('photo gallery uses authenticated blob endpoints and cleans object URLs', () => {
  assert.match(hallazgoApi, /getPhoto:[\s\S]*responseType: 'blob'/);
  assert.match(hallazgoPage, /hallazgosApi\.getPhoto/);
  assert.match(hallazgoPage, /URL\.createObjectURL/);
  assert.match(hallazgoPage, /URL\.revokeObjectURL/);
  assert.match(hallazgoPage, /multiple/);
  assert.match(hallazgoPage, /MAX_PHOTO_SIZE/);
  assert.match(hallazgosPage, /Evidencias/);
});
