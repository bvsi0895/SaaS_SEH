import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PR #24 keeps the inspection report data path UTF-8 and does not rewrite database values', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.ts'),
  ]);
  assert.match(service, /checklistItem:\s*\{\s*select: \{ descripcion: true, orden: true \}/);
  assert.doesNotMatch(service, /Buffer\.from\([^\n]*checklistItem/);
  assert.match(generator, /normalize\('NFC'\)/);
  assert.match(generator, /mojibakeMarkers/);
  assert.match(generator, /Buffer\.from\(original, 'latin1'\)\.toString\('utf8'\)/);
});

test('PR #24 uses explicit coordinates for data rows, section headings, and checklist cells', async () => {
  const generator = await read('backend/src/reportes/generators/pdf-inspeccion.generator.ts');
  assert.match(generator, /const rowY = doc\.y/);
  assert.match(generator, /text\(labelText, labelX, rowY \+ 4/);
  assert.match(generator, /text\(valueText, valueX, rowY \+ 4/);
  assert.match(generator, /text\(text, this\.left, y, \{ width: this\.contentWidth, align: 'left'/);
  assert.match(generator, /const itemX = this\.left \+ 6/);
  assert.match(generator, /const estadoX = this\.left \+ columns\.item \+ 6/);
  assert.match(generator, /const observationX = this\.left \+ columns\.item \+ columns\.estado \+ 6/);
  assert.match(generator, /Math\.max\(25, itemHeight, statusHeight, observationHeight\)/);
  assert.match(generator, /ensureChecklistHeader\(doc, data, columns\)/);
});

test('PR #24 keeps logo, authorized photos, finding state/resolution, and pagination in the inspection PDF', async () => {
  const [service, generator, spec] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.spec.ts'),
  ]);
  assert.match(service, /logo: logoResult\.buffer/);
  assert.match(service, /readPhotoForReport/);
  assert.match(generator, /data\.logo/);
  assert.match(generator, /doc\.image\(photo\.buffer/);
  assert.match(generator, /getHallazgoStatusText\(hallazgo\.estado\)/);
  assert.match(generator, /descripcionSolucion/);
  assert.match(generator, /addPageNumbers/);
  assert.match(spec, /renders eight Unicode checklist questions/);
});
