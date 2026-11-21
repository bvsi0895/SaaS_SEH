import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PR25 exposes all authorized resolution responsible roles in the active context', async () => {
  const controller = await read('backend/src/usuarios/usuarios.controller.ts');
  const service = await read('backend/src/usuarios/usuarios.service.ts');
  assert.match(controller, /responsables-resolucion/);
  assert.match(controller, /Roles\(Rol\.ADMIN_EMPRESA, Rol\.SUPERVISOR, Rol\.TECNICO\)/);
  assert.match(service, /rol: \{ in: \[Rol\.ADMIN_EMPRESA, Rol\.SUPERVISOR, Rol\.TECNICO\] \}/);
  assert.match(service, /organizacionEmpresaId/);
  assert.match(service, /establecimientoId/);
});

test('PR25 persists external responsible data and keeps audit actor separate', async () => {
  const dto = await read('backend/src/hallazgos/dto/resolver-hallazgo.dto.ts');
  const service = await read('backend/src/hallazgos/hallazgos.service.ts');
  const schema = await read('backend/prisma/schema.prisma');
  assert.match(dto, /responsableTexto/);
  assert.match(dto, /responsableCargo/);
  assert.match(service, /responsableResolucionTexto/);
  assert.match(service, /responsableResolucionCargo/);
  assert.match(service, /usuarioId,\s*responsableId/);
  assert.match(schema, /responsableResolucionTexto String\?/);
  assert.match(schema, /responsableCargo String\?/);
});

test('PR25 keeps the findings grid header typography and wrapping consistent', async () => {
  const page = await read('web/src/pages/hallazgos/HallazgosPage.tsx');
  assert.match(page, /columnHeaderHeight=\{58\}/);
  assert.match(page, /fontFamily: 'inherit'/);
  assert.match(page, /fontSize: '0\.875rem'/);
  assert.match(page, /whiteSpace: 'normal'/);
  assert.match(page, /minWidth: 980/);
});
