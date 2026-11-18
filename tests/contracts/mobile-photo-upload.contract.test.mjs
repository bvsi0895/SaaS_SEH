import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('hallazgo form validates required fields without clearing entered data', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionDetailPage.tsx');

  assert.match(source, /const validateHallazgoFields = \(\) =>/);
  assert.match(source, /El título es obligatorio\./);
  assert.match(source, /La descripción es obligatoria\./);
  assert.match(source, /La ubicación es obligatoria\./);
  assert.match(source, /helperText=\{hallazgoFieldErrors\.titulo\}/);
  assert.match(source, /helperText=\{hallazgoFieldErrors\.descripcion\}/);
  assert.match(source, /helperText=\{hallazgoFieldErrors\.ubicacionTexto\}/);
  assert.match(source, /setNuevoHallazgo\(\{ \.\.\.nuevoHallazgo, titulo: e\.target\.value \}\)/);
  assert.match(source, /setNuevoHallazgo\(\{ \.\.\.nuevoHallazgo, descripcion: e\.target\.value \}\)/);
  assert.match(source, /setNuevoHallazgo\(\{ \.\.\.nuevoHallazgo, ubicacionTexto: e\.target\.value \}\)/);
});

test('photo upload keeps multipart handling and exposes safe HTTP error details', async () => {
  const [detail, api, client] = await Promise.all([
    read('web/src/pages/inspecciones/InspeccionDetailPage.tsx'),
    read('web/src/api/hallazgos.ts'),
    read('web/src/api/client.ts'),
  ]);

  assert.match(api, /const formData = new FormData\(\)/);
  assert.match(api, /formData\.append\('file', file\)/);
  assert.match(api, /`\/hallazgos\/\$\{id\}\/fotos`/);
  assert.match(client, /config\.data instanceof FormData/);
  assert.match(client, /delete config\.headers\['Content-Type'\]/);
  assert.match(detail, /getPhotoUploadErrorMessage/);
  assert.match(detail, /status === 400/);
  assert.match(detail, /status === 413/);
  assert.match(detail, /status !== undefined && status >= 500/);
  assert.match(detail, /`HTTP \$\{status\}/);
  assert.match(detail, /Mensaje del servidor/);
  assert.match(detail, /Bearer\\s\+\\S\+.*oculto/);
  assert.doesNotMatch(detail, /showError\(error\.message\)/);
});

test('photo upload can be retried without creating another finding', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionDetailPage.tsx');
  const retryStart = source.indexOf('const handleRetryHallazgoPhoto');
  const retryEnd = source.indexOf('const handleCumplimiento', retryStart);
  const retryHandler = source.slice(retryStart, retryEnd);
  const uploadMutationStart = source.indexOf('const subirFotoMutation');
  const uploadMutationEnd = source.indexOf('const crearAccionMutation', uploadMutationStart);
  const uploadMutation = source.slice(uploadMutationStart, uploadMutationEnd);

  assert.match(retryHandler, /editingHallazgoId/);
  assert.match(retryHandler, /subirFotoMutation\.mutate/);
  assert.doesNotMatch(retryHandler, /crearHallazgoMutation\.mutate/);
  assert.match(uploadMutation, /setHallazgoPhotoUploadError\(message\)/);
  assert.match(uploadMutation, /showError\(`Hallazgo guardado, pero la fotografía no se pudo adjuntar/);
  assert.doesNotMatch(uploadMutation, /finalizarCreacionHallazgo\(\)/);
});

test('existing finding editing and corrective action flows remain intact', async () => {
  const source = await read('web/src/pages/inspecciones/InspeccionDetailPage.tsx');

  assert.match(source, /UpdateHallazgoDto/);
  assert.match(source, /actualizarHallazgoMutation/);
  assert.match(source, /hallazgosApi\.update/);
  assert.match(source, /setEditingHallazgoId\(existing\?\.id \|\| null\)/);
  assert.match(source, /setEditingAccionId\(existingAction\?\.id \|\| null\)/);
  assert.match(source, /fechaCompromiso: accionFechaCompromiso/);
  assert.match(source, /responsableId: accionResponsableId/);
  assert.match(source, /queryClient\.invalidateQueries\(\{ queryKey: \['acciones'\] \}\)/);
});

test('the web proxy allows backend image limit plus multipart overhead', async () => {
  const nginx = await read('web/nginx.conf');
  const caddy = await read('deploy/Caddyfile.example');

  assert.match(nginx, /client_max_body_size 6m/);
  assert.match(nginx, /proxy_pass http:\/\/backend:3000\/api/);
  assert.doesNotMatch(caddy, /request_body|body_size|max_size/);
});
