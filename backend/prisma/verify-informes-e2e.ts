import { PrismaClient } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

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
  let logoFixturePath = '';
  let organizationId = '';
  let originalLogoUrl: string | null = null;
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
    organizationId = context.organizacionId;
    const organization = await prisma.organizacion.findUniqueOrThrow({ where: { id: organizationId }, select: { logoUrl: true } });
    originalLogoUrl = organization.logoUrl;
    await prisma.organizacion.update({ where: { id: organizationId }, data: { logoUrl: null } });
    const withoutLogo = await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z', { headers: auth });
    if (Buffer.from(await withoutLogo.arrayBuffer()).subarray(0, 4).toString() !== '%PDF') throw new Error('El informe sin logo no devolvió un PDF válido');
    logoFixturePath = join(process.cwd(), 'uploads', 'e2e-report-logo.png');
    await mkdir(join(process.cwd(), 'uploads'), { recursive: true });
    await writeFile(logoFixturePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
    await prisma.organizacion.update({ where: { id: organizationId }, data: { logoUrl: 'uploads/e2e-report-logo.png' } });
    const withLogo = await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z', { headers: auth });
    if (Buffer.from(await withLogo.arrayBuffer()).subarray(0, 4).toString() !== '%PDF') throw new Error('El informe con logo no devolvió un PDF válido');
    await prisma.organizacion.update({ where: { id: organizationId }, data: { logoUrl: 'https://127.0.0.1:1/internal.png' } });
    const invalidLogo = await request('/reportes/mensual.pdf?fechaDesde=2000-01-01T00:00:00.000Z&fechaHasta=2100-01-01T00:00:00.000Z', { headers: auth });
    if (Buffer.from(await invalidLogo.arrayBuffer()).subarray(0, 4).toString() !== '%PDF') throw new Error('El informe con logo inválido no pudo continuar');
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
    if (organizationId) await prisma.organizacion.update({ where: { id: organizationId }, data: { logoUrl: originalLogoUrl } });
    if (logoFixturePath) await unlink(logoFixturePath).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error('E2E informes falló:', error); process.exitCode = 1; });
