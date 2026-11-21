import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PR #22 uses the active organization logo and keeps logo failures non-fatal', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.ts'),
  ]);
  assert.match(service, /organizacionEmpresa:[\s\S]*organizacion:[\s\S]*logoUrl/);
  assert.match(service, /loadConfiguredLogo\(organization\?\.logoUrl\)/);
  assert.match(service, /logo: logoResult\.buffer/);
  assert.match(generator, /data\.logo/);
  assert.match(generator, /Sistema de Seguridad e Higiene/);
  assert.match(generator, /malformado|malformed|must not prevent/i);
});

test('PR #22 normalizes visible text without changing stored data', async () => {
  const generator = await read('backend/src/reportes/generators/pdf-inspeccion.generator.ts');
  assert.match(generator, /normalize\('NFC'\)/);
  assert.match(generator, /Buffer\.from\(original, 'latin1'\)\.toString\('utf8'\)/);
  assert.match(generator, /repara sólo mojibake (?:visible en la salida|inequívoco)/);
});

test('PR #22 lays out long checklists and findings with wrapping and continuation pages', async () => {
  const generator = await read('backend/src/reportes/generators/pdf-inspeccion.generator.ts');
  assert.match(generator, /heightOfString/);
  assert.match(generator, /addContinuationHeader/);
  assert.match(generator, /this\.contentWidth/);
  assert.match(generator, /FOTOGRAFÍAS Y EVIDENCIAS/);
  assert.doesNotMatch(generator, /text\(item\.checklistItem\.descripcion, 55, y \+ 8, \{ width: 300 \}\)/);
});

test('PR #22 loads authorized evidence photos for the inspection report', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.ts'),
  ]);
  assert.match(service, /readPhotoForReport/);
  assert.match(service, /loadReportPhotos\(\[\{ sector: inspeccion\.sector/);
  assert.match(generator, /preparePhotos/);
  assert.match(generator, /\.rotate\(\)\.png\(\)/);
  assert.match(generator, /doc\.image\(photo\.buffer/);
});

test('PR #23 reports preserve finding lifecycle state and resolution details', async () => {
  const [service, inspectionGenerator, monthlyGenerator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-inspeccion.generator.ts'),
    read('backend/src/reportes/generators/pdf-mensual.generator.ts'),
  ]);
  assert.match(service, /fechaResolucion: true/);
  assert.match(service, /descripcionSolucion: true/);
  assert.match(service, /responsableResolucion: \{ select: \{ nombre: true, apellido: true \} \}/);
  assert.match(inspectionGenerator, /Estado: \$\{this\.getHallazgoStatusText\(hallazgo\.estado\)\}/);
  assert.match(inspectionGenerator, /Resolución\$\{fecha\}\$\{responsable\}/);
  assert.match(monthlyGenerator, /estado: \$\{this\.hallazgoState\(item\.estado\)\}/);
  assert.match(monthlyGenerator, /descripcionSolucion/);
});
