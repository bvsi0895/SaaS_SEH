import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PR #23 persists finding state and an append-only resolution history', async () => {
  const [schema, migration, service] = await Promise.all([
    read('backend/prisma/schema.prisma'),
    read('backend/prisma/migrations/20261120120000_hallazgo_resolution_lifecycle/migration.sql'),
    read('backend/src/hallazgos/hallazgos.service.ts'),
  ]);
  assert.match(schema, /enum EstadoHallazgo[\s\S]*PENDIENTE[\s\S]*EN_CORRECCION[\s\S]*SOLUCIONADO/);
  assert.match(schema, /model HallazgoHistorial/);
  assert.match(migration, /ADD COLUMN "estado"/);
  assert.match(migration, /CREATE TABLE "hallazgos_historial"/);
  assert.match(service, /hallazgoHistorial\.create/);
  assert.match(service, /hallazgo\.create\([\s\S]*?hallazgoHistorial\.create/);
  assert.match(service, /this\.prisma\.\$transaction\(async \(tx\)/);
  assert.match(service, /fechaResolucion/);
  assert.match(service, /descripcionSolucion/);
});

test('PR #23 exposes immediate correction and verified action resolution', async () => {
  const [controller, service, actionService] = await Promise.all([
    read('backend/src/hallazgos/hallazgos.controller.ts'),
    read('backend/src/hallazgos/hallazgos.service.ts'),
    read('backend/src/acciones-correctivas/acciones-correctivas.service.ts'),
  ]);
  assert.match(controller, /@Post\(':id\/resolver'\)/);
  assert.match(controller, /@Post\(':id\/verificar-resolucion'\)/);
  assert.match(service, /CORRECCION_INMEDIATA/);
  assert.match(service, /VERIFICACION/);
  assert.match(service, /estado === EstadoHallazgo\.SOLUCIONADO/);
  assert.match(service, /estado !== 'RESUELTA'/);
  assert.match(service, /accionesCorrectivas\.length > 0/);
  assert.match(service, /assertAuthorizedEvidenceUrls/);
  assert.match(service, /updateMany\([\s\S]*?estado: hallazgo\.estado/);
  assert.match(actionService, /markInCorrection/);
  assert.match(actionService, /this\.prisma\.\$transaction\(async \(tx\)/);
  assert.match(actionService, /updateMany\([\s\S]*?estado: accion\.estado/);
  assert.match(actionService, /No se puede crear una acción para un hallazgo solucionado/);
});

test('PR #23 blocks a checklist item from becoming compliant while its finding is open', async () => {
  const service = await read('backend/src/inspecciones/inspecciones.service.ts');
  assert.match(service, /OPEN_FINDING_REQUIRES_RESOLUTION/);
  assert.match(service, /estado: \{ not: EstadoHallazgo\.SOLUCIONADO \}/);
  assert.match(service, /assertNoOpenFindingBeforeCompliance/);
});

test('PR #23 exposes state filters, dashboard counters, and responsive table status', async () => {
  const [controller, dashboard, page, statusChip] = await Promise.all([
    read('backend/src/hallazgos/hallazgos.controller.ts'),
    read('backend/src/dashboard/dashboard.service.ts'),
    read('web/src/pages/hallazgos/HallazgosPage.tsx'),
    read('web/src/components/common/StatusChip.tsx'),
  ]);
  assert.match(controller, /@Query\('estado'\)/);
  assert.match(dashboard, /hallazgosEnCorreccion/);
  assert.match(dashboard, /hallazgosSolucionados/);
  assert.match(page, /field: 'estado'/);
  assert.match(page, /Estado/);
  assert.match(page, /columnHeaderHeight/);
  assert.match(page, /Responsables<br \/>de acciones/);
  assert.match(statusChip, /EN_CORRECCION: '#1976d2'/);
  assert.match(statusChip, /SOLUCIONADO: '#2e7d32'/);
});

test('PR #23 makes history visible in the finding detail page and refreshes scoped queries', async () => {
  const [types, api, page] = await Promise.all([
    read('web/src/types/index.ts'),
    read('web/src/api/hallazgos.ts'),
    read('web/src/pages/hallazgos/HallazgoDetailPage.tsx'),
  ]);
  assert.match(types, /interface HallazgoHistorial/);
  assert.match(api, /verificarResolucion/);
  assert.match(page, /Historial de resolución/);
  assert.match(page, /invalidateFindingQueries\(queryClient, queryScope/);
});
