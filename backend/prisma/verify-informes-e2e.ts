import { PrismaClient } from '@prisma/client';

const base = process.env.SEH_E2E_BASE_URL || 'http://localhost:3000/api';
const password = 'Password123!';
const prisma = new PrismaClient();

const request = async (path: string, init: RequestInit = {}, expected = 200) => {
  const response = await fetch(`${base}${path}`, init);
  if (response.status !== expected) {
    throw new Error(`${init.method || 'GET'} ${path}: esperado ${expected}, recibido ${response.status}: ${await response.text()}`);
  }
  return response;
};

const json = async (path: string, init: RequestInit = {}, expected = 200) => (await request(path, init, expected)).json();
const headers = (token: string, contextId: string) => ({
  Authorization: `Bearer ${token}`,
  'X-Organizacion-Empresa-Id': contextId,
});

async function main() {
  let temporaryEstablishmentId = '';
  try {
    const login = await json('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@empresademo.com.ar', password }),
    });
    const contextos = await json('/auth/contextos', { headers: { Authorization: `Bearer ${login.accessToken}` } });
    const context = contextos[0];
    if (!context) throw new Error('El usuario de demo no tiene contexto autorizado');
    const auth = headers(login.accessToken, context.organizacionEmpresaId);
    const temporary = await prisma.establecimiento.create({
      data: { empresaId: context.empresaId, nombre: `E2E Informes ${Date.now()}`, codigo: `E2E-INF-${Date.now()}` },
    });
    temporaryEstablishmentId = temporary.id;

    const establishments = await json('/auth/establecimientos', { headers: auth });
    if (establishments.length < 2) throw new Error('No se pudieron consultar múltiples establecimientos autorizados');
    const allPeriod = await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z', { headers: auth });
    const allPdf = Buffer.from(await allPeriod.arrayBuffer());
    if (allPdf.subarray(0, 4).toString() !== '%PDF') throw new Error('El informe consolidado no devolvió un PDF válido');

    const emptyPeriod = await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2000-01-31T23:59:59.999Z', { headers: auth });
    const emptyPdf = Buffer.from(await emptyPeriod.arrayBuffer());
    if (emptyPdf.subarray(0, 4).toString() !== '%PDF') throw new Error('El informe sin inspecciones no devolvió un PDF válido');

    const scoped = await request(`/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z&establecimientoId=${establishments[0].id}`, { headers: auth });
    if (Buffer.from(await scoped.arrayBuffer()).subarray(0, 4).toString() !== '%PDF') throw new Error('El informe por establecimiento no devolvió un PDF válido');
    await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z&establecimientoId=00000000-0000-0000-0000-000000000000', { headers: auth }, 404);

    await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z', { headers: headers(login.accessToken, '00000000-0000-0000-0000-000000000000') }, 403);
    console.log(`OK: informe mensual PDF, período sin inspecciones, múltiples establecimientos, filtro por establecimiento y rechazo de contexto inválido (${establishments.length} autorizados).`);
  } finally {
    if (temporaryEstablishmentId) await prisma.establecimiento.delete({ where: { id: temporaryEstablishmentId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('E2E informes falló:', error); process.exitCode = 1; });
