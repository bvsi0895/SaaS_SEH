import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('inspection detail prevents edits outside the assigned inspector while preserving safe backend messages', async () => {
  const [page, hallazgoPage] = await Promise.all([
    read('web/src/pages/inspecciones/InspeccionDetailPage.tsx'),
    read('web/src/pages/hallazgos/HallazgoDetailPage.tsx'),
  ]);
  assert.match(page, /Esta inspección está asignada a otro inspector/);
  assert.match(page, /disabled=\{!canModifyInspection/);
  assert.match(page, /getBackendErrorMessage\(error/);
  assert.match(page, /Hallazgo guardado, pero la fotografía no se pudo adjuntar/);
  assert.match(hallazgoPage, /canModifyHallazgo/);
});

test('organization logo is a server-side authenticated upload with legacy URL compatibility', async () => {
  const [controller, service, api, page] = await Promise.all([
    read('backend/src/administracion/administracion.controller.ts'),
    read('backend/src/administracion/administracion.service.ts'),
    read('web/src/api/administracion.ts'),
    read('web/src/pages/administracion/AdministracionPage.tsx'),
  ]);
  assert.match(controller, /FileInterceptor\('file'/);
  assert.match(controller, /@Post\('me\/logo'\)/);
  assert.match(controller, /@Delete\('me\/logo'\)/);
  assert.match(service, /logoUrl: relativePath/);
  assert.match(service, /assertAdmin\(organizacionId, usuarioId\)/);
  assert.match(api, /uploadLogo/);
  assert.match(page, /accept="image\/png,image\/jpeg"/);
  assert.match(page, /Máximo 2 MiB/);
});

test('monthly PDF normalizes evidence images and counts only processed photos', async () => {
  const [service, generator] = await Promise.all([
    read('backend/src/reportes/reportes.service.ts'),
    read('backend/src/reportes/generators/pdf-mensual.generator.ts'),
  ]);
  assert.match(service, /readPhotoForReport/);
  assert.match(service, /No se descargan imágenes desde URLs arbitrarias|startsWith/);
  assert.match(generator, /preparePhotos/);
  assert.match(generator, /\.rotate\(\)\.png\(\)/);
  assert.match(generator, /Se incrustaron \$\{preparedData\.fotos\.length\}/);
  assert.doesNotMatch(generator, /Imagen inválida: se omitió la miniatura/);
});

test('logo upload and PDF consumption share the 2 MiB limit and use the persistent upload volume', async () => {
  const [constant, controller, service, compose, integration] = await Promise.all([
    read('backend/src/administracion/logo.constants.ts'),
    read('backend/src/administracion/administracion.controller.ts'),
    read('backend/src/reportes/reportes.service.ts'),
    read('docker-compose.yml'),
    read('backend/integration/organization-logo-report-postgres.integration.ts'),
  ]);
  assert.match(constant, /2 \* 1024 \* 1024/);
  assert.match(controller, /MAX_ORGANIZATION_LOGO_BYTES/);
  assert.match(service, /MAX_ORGANIZATION_LOGO_BYTES/);
  assert.match(compose, /seh_uploads:\s*\/app\/uploads/);
  assert.match(integration, /uploadLogo[\s\S]*getLogo[\s\S]*generarReporteMensualPDF/);
  assert.match(integration, /reemplazo\/delete isolation|stat\(/);
});

test('inspections keep null planned dates as a dash and avoid timezone conversion', async () => {
  const page = await read('web/src/pages/inspecciones/InspeccionesPage.tsx');
  assert.match(page, /if \(!value\) return '-'/);
  assert.match(page, /value\.slice\(0, 10\)/);
  assert.doesNotMatch(page, /fechaHoraInicio.*fechaProgramada/);
});
