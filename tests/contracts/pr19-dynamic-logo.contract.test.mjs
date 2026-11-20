import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const logo = read('web/src/components/common/OrganizationLogo.tsx');
const layout = read('web/src/layouts/MainLayout.tsx');
const administrationApi = read('web/src/api/administracion.ts');

test('PR #19 loads the logo through the authenticated organization endpoint', () => {
  assert.match(administrationApi, /getLogo: async \(\) => .*get<Blob>\('\/organizaciones\/me\/logo'/s);
  assert.match(logo, /administracionApi\.getLogo\(\)/);
  assert.match(logo, /URL\.createObjectURL\(blob\)/);
  assert.match(logo, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(logo, /onError=\{handleImageError\}/);
});

test('PR #19 keeps SEH for missing logos and failed loads', () => {
  assert.match(logo, /\.catch\(\(\) =>/);
  assert.match(logo, /data-testid="seh-logo-fallback"/);
  assert.match(logo, />\s*SEH\s*</);
});

test('PR #19 prevents a previous organization logo from being rendered after a switch', () => {
  assert.match(logo, /setLoadedLogo\(\{ contextId, src: null \}\)/);
  assert.match(logo, /loadedLogo\.contextId === contextId/);
  assert.match(logo, /if \(disposed\) return/);
  assert.match(layout, /OrganizationLogo key=\{activeContextId \|\| 'no-context'\} contextId=\{activeContextId\}/);
});

test('PR #19 preserves the header title and selector and contains the image proportionally', () => {
  assert.match(layout, /Sistema de Seguridad e Higiene/);
  assert.match(layout, /aria-label="Contexto activo"/);
  assert.match(logo, /objectFit: 'contain'/);
});

