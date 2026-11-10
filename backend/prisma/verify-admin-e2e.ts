import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const base = process.env.SEH_E2E_BASE_URL || 'http://localhost:3000/api';
const password = 'Password123!';
const request = async (path: string, init: RequestInit = {}, expected = 200) => {
  const response = await fetch(`${base}${path}`, init);
  if (response.status !== expected) throw new Error(`${init.method || 'GET'} ${path}: esperado ${expected}, recibido ${response.status}: ${await response.text()}`);
  return response;
};
const json = async (path: string, init: RequestInit = {}, expected = 200) => request(path, init, expected).then((response) => response.json());
const headers = (token: string, contextId?: string) => ({ Authorization: `Bearer ${token}`, ...(contextId ? { 'X-Organizacion-Empresa-Id': contextId } : {}) });

async function main() {
  const createdCompanies: string[] = [];
  try {
    const login = await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@empresademo.com.ar', password }) });
    const contextos = await json('/auth/contextos', { headers: headers(login.accessToken) });
    if (!contextos.length) throw new Error('El usuario de demo no tiene contextos');
    const auth = headers(login.accessToken, contextos[0].organizacionEmpresaId);

    const first = await json('/organizaciones/me/empresas', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: `F4 E2E Cliente A ${Date.now()}`, cuit: `F4A${Date.now()}` }) }, 201);
    const second = await json('/organizaciones/me/empresas', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: `F4 E2E Cliente B ${Date.now()}`, cuit: `F4B${Date.now()}` }) }, 201);
    createdCompanies.push(first.empresaId, second.empresaId);

    const establishmentA = await json(`/organizaciones/me/empresas/${first.id}/establecimientos`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Planta A', codigo: `F4A-${Date.now()}`, sectores: 'Depósito, Producción' }) }, 201);
    const establishmentB = await json(`/organizaciones/me/empresas/${second.id}/establecimientos`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Planta B', codigo: `F4B-${Date.now()}`, sectores: 'Oficinas' }) }, 201);
    await request(`/organizaciones/me/empresas/${first.id}/establecimientos/${establishmentA.id}`, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ direccion: 'Dirección ficticia A' }) });
    const companies = await json('/organizaciones/me/empresas', { headers: auth });
    if (!companies.some((item: any) => item.id === first.id) || !companies.some((item: any) => item.id === second.id)) throw new Error('Las empresas creadas no quedaron vinculadas');
    const listA = await json(`/organizaciones/me/empresas/${first.id}/establecimientos`, { headers: auth });
    const listB = await json(`/organizaciones/me/empresas/${second.id}/establecimientos`, { headers: auth });
    if (!listA.some((item: any) => item.id === establishmentA.id) || !listB.some((item: any) => item.id === establishmentB.id)) throw new Error('No se pudieron consultar los establecimientos propios');
    await request(`/organizaciones/me/empresas/${first.id}/asignaciones`, { headers: auth });
    console.log('OK: E2E administración creó dos empresas, establecimientos, actualización y consulta de asignaciones.');
  } finally {
    if (createdCompanies.length) {
      await prisma.establecimiento.deleteMany({ where: { empresaId: { in: createdCompanies } } });
      await prisma.accesoEmpresa.deleteMany({ where: { empresaId: { in: createdCompanies } } });
      await prisma.organizacionEmpresa.deleteMany({ where: { empresaId: { in: createdCompanies } } });
      await prisma.empresa.deleteMany({ where: { id: { in: createdCompanies } } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('E2E administración falló:', error); process.exitCode = 1; });
