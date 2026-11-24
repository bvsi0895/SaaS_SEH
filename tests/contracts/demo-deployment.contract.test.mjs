import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const normalize = (source) => source.replaceAll('\r\n', '\n');

test('demo Compose keeps PostgreSQL private and routes public traffic through Caddy', async () => {
  const [rawCompose, rawCaddyfile] = await Promise.all([
    read('docker-compose.yml'),
    read('deploy/Caddyfile.example'),
  ]);
  const compose = normalize(rawCompose);
  const caddyfile = normalize(rawCaddyfile);
  const serviceBlock = (name) => {
    const match = compose.match(new RegExp(`^  ${name}:\\n[\\s\\S]*?(?=^  [a-z][\\w-]*:|^volumes:)`, 'm'));
    assert.ok(match, `service ${name} must be present in Compose`);
    return match[0];
  };
  assert.match(compose, /caddy:\n\s+profiles:\n\s+- bundled-caddy[\s\S]*image: caddy:2\.8-alpine/);
  assert.match(compose, /profiles:\n\s+- bundled-caddy/);
  assert.match(caddyfile, /reverse_proxy seh-web:80/);
  assert.match(compose, /HTTP_PORT:-80/);
  assert.match(compose, /HTTPS_PORT:-443/);
  assert.doesNotMatch(serviceBlock('postgres'), /\n\s+ports:/);
  assert.doesNotMatch(serviceBlock('backend'), /\n\s+ports:/);
  assert.doesNotMatch(serviceBlock('web'), /\n\s+ports:/);
  assert.match(serviceBlock('web'), /http:\/\/127\.0\.0\.1\/health/);
});

test('demo defaults use a relative API path, short access-token lifetime, and disabled Swagger', async () => {
  const [rawCompose, env, demoEnv, rawWebDockerfile, rawBackendDockerfile, backendMain] = await Promise.all([
    read('docker-compose.yml'),
    read('.env.example'),
    read('deploy/demo.env.example'),
    read('web/Dockerfile'),
    read('backend/Dockerfile'),
    read('backend/src/main.ts'),
  ]);
  const compose = normalize(rawCompose);
  const webDockerfile = normalize(rawWebDockerfile);
  const backendDockerfile = normalize(rawBackendDockerfile);
  for (const source of [compose, env, demoEnv]) assert.match(source, /JWT_EXPIRATION[=:].*15m/);
  for (const source of [env, demoEnv]) assert.match(source, /VITE_API_URL=\/api/);
  assert.match(compose, /VITE_API_URL: \$\{VITE_API_URL:-\/api\}/);
  assert.match(webDockerfile, /ARG VITE_API_URL=\/api/);
  assert.match(webDockerfile, /127\.0\.0\.1\/health/);
  assert.match(backendDockerfile, /127\.0\.0\.1:3000\/api\/health/);
  assert.match(compose, /ENABLE_SWAGGER: \$\{ENABLE_SWAGGER:-false\}/);
  assert.match(backendMain, /process\.env\.ENABLE_SWAGGER === 'true'/);
});

test('demo backup and restore scripts protect data and require explicit restore confirmation', async () => {
  const [backup, restore] = await Promise.all([
    read('scripts/backup-demo.sh'),
    read('scripts/restore-demo.sh'),
  ]);
  assert.match(backup, /pg_dump/);
  assert.match(backup, /exec -T backend sh -c/);
  assert.match(backup, /tar -czf - -C \/app\/uploads \./);
  assert.match(backup, /sha256sum database\.dump uploads\.tar\.gz/);
  assert.doesNotMatch(backup, /-v .*:\/backup/);
  assert.match(restore, /CONFIRM_RESTORE.*YES/);
  assert.match(restore, /pg_restore[\s\S]*--single-transaction/);
  assert.match(restore, /tar -xzf - -C \/app\/uploads/);
  assert.doesNotMatch(restore, /-v .*:\/backup/);
  assert.match(restore, /stop backend web/);
  assert.doesNotMatch(restore, /stop backend web caddy/);
  assert.ok(restore.indexOf('pg_restore') < restore.indexOf('prisma migrate deploy'));
});
