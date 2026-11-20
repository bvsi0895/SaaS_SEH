import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('hallazgos expose inspector and multiple action responsible users', async () => {
  const [service, page] = await Promise.all([
    read('backend/src/hallazgos/hallazgos.service.ts'),
    read('web/src/pages/hallazgos/HallazgosPage.tsx'),
  ]);
  assert.match(service, /usuario: \{ select: \{ id: true, nombre: true, apellido: true \} \}/);
  assert.match(service, /responsable: \{ select: \{ id: true, nombre: true, apellido: true \} \}/);
  assert.match(page, /Técnico inspector/);
  assert.match(page, /Responsables de acciones/);
  assert.match(page, /Array\.from\(new Set\(responsables\)\)/);
});

test('mutations invalidate related scoped queries, including dashboard metrics', async () => {
  const [newInspection, inspectionDetail, findingDetail, actionDetail, queryKeys] = await Promise.all([
    read('web/src/pages/inspecciones/NuevaInspeccionPage.tsx'),
    read('web/src/pages/inspecciones/InspeccionDetailPage.tsx'),
    read('web/src/pages/hallazgos/HallazgoDetailPage.tsx'),
    read('web/src/pages/acciones/AccionDetailPage.tsx'),
    read('web/src/queryKeys.ts'),
  ]);
  assert.match(newInspection, /invalidateInspectionQueries\(queryClient, queryScope, inspeccion\.id\)/);
  assert.match(inspectionDetail, /invalidateInspectionQueries\(queryClient, queryScope/);
  assert.match(inspectionDetail, /invalidateFindingQueries\(queryClient, queryScope/);
  assert.match(inspectionDetail, /invalidateActionQueries\(queryClient, queryScope/);
  assert.match(findingDetail, /invalidateFindingQueries\(queryClient, queryScope/);
  assert.match(findingDetail, /invalidateActionQueries\(queryClient, queryScope/);
  assert.match(actionDetail, /invalidateActionQueries\(queryClient, queryScope/);
  assert.match(queryKeys, /dashboard: \(scope: QueryScope\)/);
  assert.match(queryKeys, /scope\.contextId/);
  assert.match(queryKeys, /scope\.userId/);
  assert.match(queryKeys, /scope\.role/);
});

test('inspection finding form assigns authorized responsible users and supports safe retries', async () => {
  const [page, service] = await Promise.all([
    read('web/src/pages/inspecciones/InspeccionDetailPage.tsx'),
    read('backend/src/inspecciones/inspecciones.service.ts'),
  ]);
  assert.match(page, /queryFn: usuariosApi\.getTecnicos/);
  assert.match(page, /label="Responsable \(opcional\)"/);
  assert.match(page, /responsableId: accionResponsableId/);
  assert.match(page, /accionDescripcion\.trim\(\)\.length < 10/);
  assert.match(page, /Date\.parse\(`\$\{accionFechaCompromiso\}T00:00:00`\)/);
  assert.match(page, /tecnicos\.some\(\(tecnico\) => tecnico\.id === accionResponsableId && tecnico\.activo\)/);
  assert.match(page, /El hallazgo ya fue guardado, pero no se pudo crear la acción correctiva/);
  assert.match(page, /setEditingHallazgoId\(hallazgo\.id\)/);
  assert.match(page, /value=\{accionResponsableId\}/);
  assert.match(page, /Sin asignar/);
  assert.match(page, /setHallazgoPhoto\(null\);\s+guardarAccionCorrectiva/);
  assert.match(service, /responsableId: true,\s+fechaCompromiso: true/);
});

