import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("POST /empresas no es público y crea dentro de una organización autorizada", async () => {
  const source = await read("backend/src/empresas/empresas.controller.ts");
  const service = await read("backend/src/empresas/empresas.service.ts");

  assert.match(source, /@UseGuards\(JwtAuthGuard\)\s+@Post\(\)/);
  assert.doesNotMatch(source, /@Public\(\)[\s\S]*@Post\(\)/);
  assert.match(source, /@CurrentUser\('organizacionId'\) organizacionId/);
  assert.match(service, /organizacionEmpresa\.create/);
  assert.match(service, /accesoEmpresa\.create/);
  assert.match(service, /RolOrganizacion\.OWNER/);
  assert.match(service, /RolOrganizacion\.ADMIN_ORGANIZACION/);
});

test("refresh revalida y conserva el contexto activo", async () => {
  const source = await read("backend/src/auth/auth.service.ts");

  assert.match(source, /payload\.organizacionEmpresaId/);
  assert.match(
    source,
    /resolveForUser\(\s*usuario\.id,\s*\n?\s*usuario\.empresaId,\s*\n?\s*payload\.organizacionEmpresaId/,
  );
  assert.match(source, /generateTokens\(usuario, context\)/);
});

test("hallazgo no acepta URLs arbitrarias y conserva la carga multipart autorizada", async () => {
  const [createDto, updateDto, service, controller] = await Promise.all([
    read("backend/src/hallazgos/dto/create-hallazgo.dto.ts"),
    read("backend/src/hallazgos/dto/update-hallazgo.dto.ts"),
    read("backend/src/hallazgos/hallazgos.service.ts"),
    read("backend/src/hallazgos/hallazgos.controller.ts"),
  ]);

  assert.doesNotMatch(createDto, /fotosUrls/);
  assert.doesNotMatch(updateDto, /fotosUrls/);
  assert.doesNotMatch(service, /createHallazgoDto\.fotosUrls/);
  assert.match(controller, /FileInterceptor\('file'/);
  assert.match(controller, /addPhoto\(id, empresaId, file/);
});

test("mobile separates finding creation from photo upload and retries only the photo", async () => {
  const [screen, api] = await Promise.all([
    read("mobile/app/hallazgo/nuevo.tsx"),
    read("mobile/src/api/hallazgos.ts"),
  ]);

  assert.match(screen, /hallazgoCreadoId/);
  assert.match(screen, /photoUploadMutation/);
  assert.match(screen, /if \(hallazgoCreadoId\)/);
  assert.match(screen, /photoUploadMutation\.mutate\(\{ id: hallazgoCreadoId, photo: foto \}\)/);
  assert.match(screen, /fileSize: result\.assets\[0\]\.fileSize/);
  const retryStart = screen.indexOf("if (hallazgoCreadoId)");
  const retryEnd = screen.indexOf("if (!titulo.trim())", retryStart);
  assert.ok(retryStart >= 0 && retryEnd > retryStart);
  assert.doesNotMatch(screen.slice(retryStart, retryEnd), /createMutation\.mutate/);
  assert.match(screen, /La fotografía no se pudo cargar/);
  assert.match(screen, /photoUploadError/);
  assert.match(api, /MAX_PHOTO_BYTES = 5 \* 1024 \* 1024/);
  assert.match(api, /La fotografía supera el límite permitido de 5 MiB/);
  assert.match(api, /uploadPhoto: async/);
});

test("consultoras distintas siguen separando expedientes de una empresa compartida", async () => {
  const source = await read(
    "backend/integration/multiempresa-pr28-postgres.integration.ts",
  );

  assert.match(source, /shared company|compartida/i);
  assert.match(source, /relacionA/);
  assert.match(source, /relacionB/);
  assert.match(source, /findings\.create/);
  assert.match(source, /organizacionEmpresaId/);
});

