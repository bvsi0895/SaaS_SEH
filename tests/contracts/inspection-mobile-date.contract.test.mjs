import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('inspection finding photos provide camera and gallery inputs with backend validation', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionDetailPage.tsx');

  assert.match(source, /Tomar fotografía/);
  assert.match(source, /accept="image\/\*"/);
  assert.match(source, /capture="environment"/);
  assert.match(source, /Elegir de galería/);
  assert.match(source, /accept=\{HALLAZGO_PHOTO_ACCEPT\}/);
  assert.match(source, /HALLAZGO_PHOTO_TYPES = new Set\(\['image\/jpeg', 'image\/png', 'image\/webp'\]\)/);
  assert.match(source, /MAX_HALLAZGO_PHOTO_SIZE = 5 \* 1024 \* 1024/);
  assert.match(source, /HEIC\/HEIF no es compatible/);
  assert.match(source, /No se seleccionó ninguna fotografía/);
  assert.match(source, /Fotografía seleccionada: \{hallazgoPhoto\.name\}/);
});

test('inspection finding keeps editing, corrective action and retry flows', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionDetailPage.tsx');

  assert.match(source, /UpdateHallazgoDto/);
  assert.match(source, /actualizarHallazgoMutation/);
  assert.match(source, /hallazgosApi\.update/);
  assert.match(source, /setEditingHallazgoId\(existing\?\.id \|\| null\)/);
  assert.match(source, /setEditingAccionId\(existingAction\?\.id \|\| null\)/);
  assert.match(source, /fechaCompromiso: accionFechaCompromiso/);
  assert.match(source, /responsableId: accionResponsableId/);
  assert.match(source, /guardarAccionCorrectiva\(hallazgo\.id/);
  assert.match(source, /El hallazgo ya fue guardado, pero no se pudo crear la acción correctiva/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \['acciones'\] \}\)/);
  assert.match(source, /subirFotoMutation\.isPending/);
});

test('inspection scheduled dates render only fechaProgramada without timezone conversion or fallback', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionesPage.tsx');

  assert.match(source, /field: 'fechaProgramada'/);
  assert.match(source, /valueGetter: \(params\) => dateValue\(params\.row\.fechaProgramada\)/);
  assert.match(source, /if \(!value\) return '-';/);
  assert.match(source, /value\.slice\(0, 10\)/);
  assert.match(source, /`\$\{day\}\/\$\{month\}\/\$\{year\}`/);
  assert.doesNotMatch(source, /HH:mm/);
  assert.doesNotMatch(source, /fechaProgramada \|\| fechaHoraInicio/);
});
