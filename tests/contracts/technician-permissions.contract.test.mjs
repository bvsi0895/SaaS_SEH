import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('backend scopes technicians and protects assigned actions/findings', async () => {
  const [inspections, actions, findings, checklists, checklistPage, checklistDetail] = await Promise.all([
    read('backend/src/inspecciones/inspecciones.controller.ts'),
    read('backend/src/acciones-correctivas/acciones-correctivas.controller.ts'),
    read('backend/src/hallazgos/hallazgos.service.ts'),
    read('backend/src/checklists/checklists.controller.ts'),
    read('web/src/pages/checklists/ChecklistsPage.tsx'),
    read('web/src/pages/checklists/ChecklistDetailPage.tsx'),
  ]);
  assert.match(inspections, /@Roles\(Rol\.ADMIN_EMPRESA, Rol\.SUPERVISOR, Rol\.TECNICO\)/);
  assert.match(inspections, /asignadoAId: currentUserRole === Rol\.TECNICO \? currentUserId/);
  assert.match(actions, /currentUserRole === Rol\.TECNICO \? currentUserId : undefined/);
  assert.match(findings, /accionesCorrectivas: \{ some: \{ responsableId: usuarioId \} \}/);
  assert.match(checklists, /@Roles\(Rol\.ADMIN_EMPRESA\)/);
  assert.match(checklistPage, /canManageChecklists = user\?\.rol === 'ADMIN_EMPRESA'/);
  assert.match(checklistDetail, /canManageChecklists = user\?\.rol === 'ADMIN_EMPRESA'/);
});

test('frontend uses technician endpoints and valid overdue filters', async () => {
  const [actions, actionPage, inspections, hallazgos] = await Promise.all([
    read('web/src/api/acciones.ts'),
    read('web/src/pages/acciones/AccionesPage.tsx'),
    read('web/src/pages/inspecciones/InspeccionesPage.tsx'),
    read('web/src/pages/hallazgos/HallazgosPage.tsx'),
  ]);
  assert.match(actions, /\/acciones-correctivas\/me/);
  assert.match(actionPage, /value="VENCIDAS"/);
  assert.doesNotMatch(actionPage, /value="VENCIDA"/);
  assert.match(inspections, /setPage\(0\)/);
  assert.match(hallazgos, /paginationMode=\{data && !data\.isPaginated \? 'client' : 'server'\}/);
});

