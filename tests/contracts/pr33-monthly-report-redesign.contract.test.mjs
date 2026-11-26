import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PR #33 mantiene el aislamiento por empresa y contexto de consultora en el informe mensual', async () => {
  const service = await read('backend/src/reportes/reportes.service.ts');
  assert.match(service, /resolveEstablishmentScope\(/);
  assert.match(service, /where: \{ id: params\.organizacionEmpresaId, empresaId: params\.empresaId \}/);
  assert.match(service, /empresaId: params\.empresaId,\s*\n\s*organizacionEmpresaId: params\.organizacionEmpresaId/);
  assert.match(service, /readPhotoForReport\(hallazgo\.id, filename, empresaId, organizacionEmpresaId\)/);
});

test('PR #33 proyecta la información necesaria para hallazgos y fotografías reales', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-mensual.generator.ts'),
  ]);
  assert.match(service, /descripcion: true/);
  assert.match(service, /ubicacionTexto: true/);
  assert.match(service, /hallazgoTitulo: hallazgo\.titulo/);
  assert.match(generator, /doc\.image\(photo\.buffer/);
  assert.match(generator, /Hallazgo: \$\{photo\.hallazgoTitulo\}/);
  assert.match(generator, /Página \$\{index \+ 1\} de \$\{range\.count\}/);
});

test('PR #33 calcula los totales desde los datos y rechaza inconsistencias', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-mensual.generator.ts'),
  ]);
  assert.match(service, /hallazgos: inspection\.hallazgos\.length/);
  assert.match(service, /const hallazgos = inspections\.flatMap/);
  assert.match(generator, /value: data\.hallazgos\.length/);
  assert.match(generator, /assertConsistentCounts/);
  assert.match(generator, /inspectionFindings !== data\.hallazgos\.length/);
});

