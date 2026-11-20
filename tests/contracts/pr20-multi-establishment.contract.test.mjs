import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('reuses the existing establishment access model and keeps technician scope explicit', async () => {
  const [schema, tenancy, assignment] = await Promise.all([
    read('backend/prisma/schema.prisma'),
    read('backend/src/tenancy/tenancy.service.ts'),
    read('backend/src/administracion/administracion.service.ts'),
  ]);

  assert.match(schema, /model AccesoEstablecimiento/);
  assert.match(schema, /establecimientos\s+AccesoEstablecimiento\[\]/);
  assert.match(schema, /establecimientoId\s+String\?/);
  assert.match(tenancy, /if \(access\.rol !== Rol\.TECNICO\) return undefined/);
  assert.match(tenancy, /return access\.establecimientos[\s\S]*\.map\(\(item\) => item\.establecimientoId\)/);
  assert.match(assignment, /accesoEstablecimiento\.deleteMany/);
  assert.match(assignment, /establecimientoIds/);
  assert.match(assignment, /empresaId: relation\.empresaId/);
});

// These checks complement the runtime Jest and PostgreSQL integration suites.
test('applies the same authorized establishment scope to inspections and dashboard metrics', async () => {
  const [inspectionService, dashboard, findings, actions] = await Promise.all([
    read('backend/src/inspecciones/inspecciones.service.ts'),
    read('backend/src/dashboard/dashboard.service.ts'),
    read('backend/src/hallazgos/hallazgos.service.ts'),
    read('backend/src/acciones-correctivas/acciones-correctivas.service.ts'),
  ]);

  assert.match(inspectionService, /establecimientoId: \{ in: scope \}/);
  assert.match(inspectionService, /assertEstablishmentAccess\(dto\.establecimientoId/);
  assert.match(inspectionService, /if \(currentUserRole === Rol\.TECNICO && !inspeccion\.establecimientoId\)/);
  assert.match(dashboard, /getEstablishmentScope\(accesoEmpresaId, empresaId\)/);
  assert.match(findings, /getEstablishmentScope\(accesoEmpresaId, empresaId, organizacionEmpresaId\)/);
  assert.match(actions, /getEstablishmentScope\(accesoEmpresaId, empresaId, organizacionEmpresaId\)/);
});
test('keeps historical inspections explicit and exposes the shared frontend filter', async () => {
  const [inspectionsPage, newInspection, selector, inspectionApi] = await Promise.all([
    read('web/src/pages/inspecciones/InspeccionesPage.tsx'),
    read('web/src/pages/inspecciones/NuevaInspeccionPage.tsx'),
    read('web/src/components/common/EstablishmentSelector.tsx'),
    read('web/src/api/inspecciones.ts'),
  ]);

  assert.match(inspectionsPage, /Sin establecimiento \(histórica\)/);
  assert.match(inspectionsPage, /EstablishmentSelector/);
  assert.match(newInspection, /establecimientoId/);
  assert.match(selector, /Todos mis establecimientos/);
  assert.match(selector, /authApi\.getEstablishments/);
  assert.match(inspectionApi, /establecimientoId\?: string/);
});

// End of PR #20 contract checks.
