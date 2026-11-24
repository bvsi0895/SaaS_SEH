import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('demo Compose keeps PostgreSQL private and routes public traffic through Caddy', async () => {
  const [compose, caddyfile] = await Promise.all([
    read('docker-compose.yml'),
    read('deploy/Caddyfile.example'),
  ]);
  const serviceBlock = (name) => compose.match(new RegExp(`\\n  ${name}:\\n[\\s\\S]*?(?=\\n  [a-z][\\w-]*:|\\nvolumes:)`))?.[0] ?? '';
  assert.match(compose, /caddy:\s+\n[\s\S]*image: caddy:2\.8-alpine/);
  assert.match(caddyfile, /reverse_proxy web:80/);
  assert.match(compose, /HTTP_PORT:-80/);
  assert.match(compose, /HTTPS_PORT:-443/);
  assert.doesNotMatch(serviceBlock('postgres'), /\n\s+ports:/);
  assert.doesNotMatch(serviceBlock('backend'), /\n\s+ports:/);
  assert.doesNotMatch(serviceBlock('web'), /\n\s+ports:/);
});

test('demo defaults use a relative API path, short access-token lifetime, and disabled Swagger', async () => {
  const [compose, env, demoEnv, webDockerfile, backendMain] = await Promise.all([
    read('docker-compose.yml'),
    read('.env.example'),
    read('deploy/demo.env.example'),
    read('web/Dockerfile'),
    read('backend/src/main.ts'),
  ]);
  for (const source of [compose, env, demoEnv]) assert.match(source, /JWT_EXPIRATION[=:].*15m/);
  for (const source of [env, demoEnv]) assert.match(source, /VITE_API_URL=\/api/);
  assert.match(compose, /VITE_API_URL: \$\{VITE_API_URL:-\/api\}/);
  assert.match(webDockerfile, /ARG VITE_API_URL=\/api/);
  assert.match(compose, /ENABLE_SWAGGER: \$\{ENABLE_SWAGGER:-false\}/);
  assert.match(backendMain, /process\.env\.ENABLE_SWAGGER === 'true'/);
});

test('demo backup and restore scripts protect data and require explicit restore confirmation', async () => {
  const [backup, restore] = await Promise.all([
    read('scripts/backup-demo.sh'),
    read('scripts/restore-demo.sh'),
  ]);
  assert.match(backup, /pg_dump/);
  assert.match(backup, /uploads\.tar\.gz/);
  assert.match(backup, /sha256sum/);
  assert.match(restore, /CONFIRM_RESTORE.*YES/);
  assert.match(restore, /pg_restore/);
  assert.match(restore, /prisma migrate deploy/);
});
