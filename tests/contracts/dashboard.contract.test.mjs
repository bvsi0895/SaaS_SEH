import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) =>
  readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('dashboard backend exposes scoped technician metrics and an explicit metric contract', async () => {
  const [controller, service] = await Promise.all([
    read('backend/src/dashboard/dashboard.controller.ts'),
    read('backend/src/dashboard/dashboard.service.ts'),
  ]);
  assert.match(
    controller,
    /@Roles\(Rol\.ADMIN_EMPRESA, Rol\.SUPERVISOR, Rol\.TECNICO\)/,
  );
  assert.match(
    controller,
    /getKPIs\([\s\S]*?empresaId,[\s\S]*?accesoEmpresaId,[\s\S]*?usuarioId,[\s\S]*?rol,/,
  );
  assert.match(service, /fechaHoraInicio: \{ not: null \}/);
  assert.match(
    service,
    /accionesCorrectivas:\s*\{\s*none:\s*\{\s*estado: EstadoAccion\.RESUELTA/,
  );
  assert.match(service, /cumplimiento !== CumplimientoItem\.NO_APLICA/);
  assert.match(
    service,
    /porcentajeCumplimiento\s*=\s*\n?\s*evaluableItems > 0/,
  );
  assert.match(service, /responsableId: usuarioId/);
  assert.match(service, /hallazgos: await this\.prisma\.hallazgo\.count/);
});

test('dashboard frontend preserves backend values and exposes retry states', async () => {
  const [api, page] = await Promise.all([
    read('web/src/api/dashboard.ts'),
    read('web/src/pages/dashboard/DashboardPage.tsx'),
  ]);
  assert.equal(
    (api.match(/apiClient\.get<DashboardKPIs>\('\/dashboard\/kpis'/g) ?? [])
      .length,
    1,
  );
  assert.match(api, /params: \{ periodo, \.\.\.filters \}/);
  assert.match(api, /fecha: item\.createdAt/);
  assert.match(page, /isError: kpisError/);
  assert.match(page, /Reintentar/);
  assert.match(page, /tasaCumplimiento === null\s*\?\s*'—'/);
  assert.doesNotMatch(page, /kpis\?\.[A-Za-z]+\s*\|\|\s*0/);
  assert.doesNotMatch(page, /getTendencias\(6/);
});
