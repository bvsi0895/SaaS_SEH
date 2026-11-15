import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const apiSource = readFileSync(resolve(repositoryRoot, 'web/src/api/checklists.ts'), 'utf8');
const updateItemBlock = apiSource.match(/updateItem:[\s\S]*?deleteItem:/)?.[0];

test('checklist item update uses the backend PUT contract', () => {
  assert.ok(updateItemBlock, 'updateItem API function was not found');
  assert.match(updateItemBlock, /apiClient\.put<ChecklistItem>\(/);
  assert.doesNotMatch(updateItemBlock, /apiClient\.patch<ChecklistItem>\(/);
  assert.match(updateItemBlock, /\/checklists\/items\/\$\{itemId\}/);
});
