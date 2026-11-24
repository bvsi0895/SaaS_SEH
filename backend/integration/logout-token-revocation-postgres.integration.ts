import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion } from '@prisma/client';

const prisma = new PrismaClient();
const base = process.env.SEH_E2E_BASE_URL || 'http://localhost:3000/api';
const password = 'Logout-Revocation-2026!';

const request = async (path: string, init: RequestInit = {}, expected?: number) => {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* respuesta no JSON */ }
  if (expected !== undefined) {
    assert.equal(response.status, expected, `${init.method || 'GET'} ${path}: ${text.slice(0, 240)}`);
  }
  return { status: response.status, body };
};

const authHeaders = (token: string, contextId?: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  ...(contextId ? { 'X-Organizacion-Empresa-Id': contextId } : {}),
});

async function main() {
  const ids = {
    empresa: randomUUID(),
    organizacion: randomUUID(),
    relacion: randomUUID(),
    miembro: randomUUID(),
    usuario: randomUUID(),
    acceso: randomUUID(),
  };
  const email = `logout-revocation-${ids.usuario}@seh.test`;

  try {
    await prisma.empresa.create({
      data: { id: ids.empresa, nombre: 'Logout token revocation fixture', cuit: `LTR-${ids.empresa}` },
    });
    await prisma.organizacion.create({
      data: { id: ids.organizacion, nombre: 'Logout token revocation organization', tipo: TipoOrganizacion.CONSULTORA },
    });
    await prisma.organizacionEmpresa.create({
      data: { id: ids.relacion, organizacionId: ids.organizacion, empresaId: ids.empresa },
    });

    await prisma.usuario.create({
      data: {
        id: ids.usuario,
        email,
        password: await bcrypt.hash(password, 10),
        nombre: 'Logout',
        apellido: 'Revocation',
        rol: Rol.TECNICO,
        empresaId: ids.empresa,
      },
    });
    await prisma.organizacionMiembro.create({
      data: {
        id: ids.miembro,
        organizacionId: ids.organizacion,
        usuarioId: ids.usuario,
        rol: RolOrganizacion.AUDITOR_ORGANIZACION,
      },
    });
    await prisma.accesoEmpresa.create({
      data: {
        id: ids.acceso,
        organizacionEmpresaId: ids.relacion,
        organizacionMiembroId: ids.miembro,
        organizacionId: ids.organizacion,
        empresaId: ids.empresa,
        rol: Rol.TECNICO,
      },
    });

    const login = async () => request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, 200);
    const first = await login();
    const second = await login();
    const firstAccess = (first.body as { accessToken: string }).accessToken;
    const secondAccess = (second.body as { accessToken: string }).accessToken;
    const secondRefresh = (second.body as { refreshToken: string }).refreshToken;

    const contextsBefore = await request('/auth/contextos', { headers: authHeaders(firstAccess) }, 200);
    await request('/auth/logout', { method: 'POST', headers: authHeaders(firstAccess) }, 200);

    await request('/auth/me', { headers: authHeaders(firstAccess) }, 401);
    await request('/auth/me', { headers: authHeaders(secondAccess) }, 401);
    await request('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: secondRefresh }),
    }, 401);

    const freshLogin = await login();
    const contextsAfter = await request('/auth/contextos', {
      headers: authHeaders((freshLogin.body as { accessToken: string }).accessToken),
    }, 200);
    assert.deepEqual(contextsAfter.body, contextsBefore.body, 'logout no debe alterar contextos ni roles');

    console.log('Logout token revocation PostgreSQL integration passed: logout invalidated both access devices and refresh token while preserving contexts');
  } finally {
    await prisma.accesoEmpresa.deleteMany({ where: { id: ids.acceso } });
    await prisma.organizacionMiembro.deleteMany({ where: { id: ids.miembro } });
    await prisma.usuario.deleteMany({ where: { id: ids.usuario } });
    await prisma.organizacionEmpresa.deleteMany({ where: { id: ids.relacion } });
    await prisma.organizacion.deleteMany({ where: { id: ids.organizacion } });
    await prisma.empresa.deleteMany({ where: { id: ids.empresa } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Logout token revocation integration failed:', error);
  process.exitCode = 1;
});
