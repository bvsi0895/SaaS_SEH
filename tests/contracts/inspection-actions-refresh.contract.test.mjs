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

test('mutations invalidate related lists without dropping context-aware query keys', async () => {
  const [newInspection, inspectionDetail, findingDetail, actionDetail] = await Promise.all([
    read('web/src/pages/inspecciones/NuevaInspeccionPage.tsx'),
    read('web/src/pages/inspecciones/InspeccionDetailPage.tsx'),
    read('web/src/pages/hallazgos/HallazgoDetailPage.tsx'),
    read('web/src/pages/acciones/AccionDetailPage.tsx'),
  ]);
  assert.match(newInspection, /queryClient\.invalidateQueries\(\{ queryKey: \['inspecciones'\] \}\)/);
  assert.match(inspectionDetail, /queryClient\.invalidateQueries\(\{ queryKey: \['hallazgos'\] \}\)/);
  assert.match(inspectionDetail, /queryClient\.invalidateQueries\(\{ queryKey: \['acciones'\] \}\)/);
  assert.match(findingDetail, /queryClient\.invalidateQueries\(\{ queryKey: \['hallazgos'\] \}\)/);
  assert.match(actionDetail, /queryClient\.invalidateQueries\(\{ queryKey: \['hallazgos'\] \}\)/);
  assert.match(actionDetail, /queryKey: \['accion', id, activeContextId, user\?\.id, user\?\.rol\]/);
});
