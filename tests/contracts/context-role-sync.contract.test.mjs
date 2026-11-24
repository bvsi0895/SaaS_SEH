import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('web and mobile restore and apply the role from the authorized context', async () => {
  const [webAuth, mobileAuth, webTypes, mobileTypes] = await Promise.all([
    read('web/src/contexts/AuthContext.tsx'),
    read('mobile/src/contexts/AuthContext.tsx'),
    read('web/src/types/index.ts'),
    read('mobile/src/types/index.ts'),
  ]);

  for (const source of [webAuth, mobileAuth]) {
    assert.match(source, /syncUserWithContext/);
    assert.match(source, /loadContexts\(userData\)/);
    assert.match(source, /setUser\(\(currentUser\) => syncUserWithContext\(currentUser, selectedContext\)\)/);
    assert.match(source, /await loadContexts\(user\)/);
  }

  for (const source of [webTypes, mobileTypes]) {
    assert.match(source, /organizacionEmpresaId: string;[\s\S]*rol: Rol;/);
  }
});
