import * as bcrypt from 'bcrypt';
import { PrismaClient, Rol, RolOrganizacion } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const base = process.env.SEH_E2E_BASE_URL || 'http://localhost:3000/api';
const adminPassword = 'Password123!';
const technicianPassword = 'F4-Revocation-Only-123!';
const request = async (path: string, init: RequestInit = {}, expected = 200) => {
  const response = await fetch(`${base}${path}`, init);
  if (response.status !== expected) throw new Error(`${init.method || 'GET'} ${path}: esperado ${expected}, recibido ${response.status}: ${await response.text()}`);
  return response;
};
const json = async (path: string, init: RequestInit = {}, expected = 200) => request(path, init, expected).then((response) => response.json());
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const headers = (token: string, contextId: string) => ({ Authorization: `Bearer ${token}`, 'X-Organizacion-Empresa-Id': contextId });

async function main() {
  let empresaId = '';
  let relationId = '';
  let memberId = '';
  let technicianId = '';
  try {
    const login = await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@empresademo.com.ar', password: adminPassword }) });
    const contextos = await json('/auth/contextos', { headers: bearer(login.accessToken) });
    const baseContext = contextos[0];
    if (!baseContext) throw new Error('No hay contexto administrativo para la prueba');
    const adminHeaders = headers(login.accessToken, baseContext.organizacionEmpresaId);
    const relation = await json('/organizaciones/me/empresas', { method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: `F4 Revocación ${Date.now()}`, cuit: `F4R${Date.now()}` }) }, 201);
    relationId = relation.id;
    empresaId = relation.empresaId;
    const email = `f4-revocation-${Date.now()}@demo.local`;
    const password = await bcrypt.hash(technicianPassword, 10);
    const technician = await prisma.usuario.create({ data: { id: randomUUID(), email, password, nombre: 'Técnico', apellido: 'Revocable', rol: Rol.TECNICO, empresaId } });
    technicianId = technician.id;
    const targetHeaders = headers(login.accessToken, relationId);
    const added = await json('/organizaciones/me/miembros', { method: 'POST', headers: { ...targetHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, rol: RolOrganizacion.AUDITOR_ORGANIZACION, rolOperativo: Rol.TECNICO }) }, 201);
    memberId = added.id;
    const technicianLogin = await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: technicianPassword }) });
    await request(`/organizaciones/me/empresas/${relationId}/establecimientos`, { headers: headers(technicianLogin.accessToken, relationId) });
    const accesses = await json(`/organizaciones/me/empresas/${relationId}/asignaciones`, { headers: targetHeaders });
    const access = accesses.find((item: any) => item.organizacionMiembro?.usuario?.email === email);
    if (!access) throw new Error('No se encontró la asignación temporal');
    await request(`/organizaciones/me/empresas/${relationId}/asignaciones/${access.id}/revocar`, { method: 'POST', headers: targetHeaders }, 201);
    await request(`/organizaciones/me/empresas/${relationId}/establecimientos`, { headers: headers(technicianLogin.accessToken, relationId) }, 403);
    console.log('OK: la revocación impidió nuevas operaciones usando una sesión JWT activa.');
  } finally {
    if (empresaId) {
      await prisma.establecimiento.deleteMany({ where: { empresaId } });
      await prisma.accesoEmpresa.deleteMany({ where: { empresaId } });
    }
    if (memberId) await prisma.organizacionMiembro.deleteMany({ where: { id: memberId } });
    if (technicianId) await prisma.usuario.deleteMany({ where: { id: technicianId } });
    if (relationId) await prisma.organizacionEmpresa.deleteMany({ where: { id: relationId } });
    if (empresaId) await prisma.empresa.deleteMany({ where: { id: empresaId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('E2E revocación falló:', error); process.exitCode = 1; });
