import { PrismaClient, Rol, RolOrganizacion, TipoChecklist } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const apiUrl = process.env.SEH_E2E_API_URL || 'http://localhost:3000/api';
const password = 'E2E-Only-Password-123!';

async function request(path: string, init: RequestInit = {}, expectedStatus = 200): Promise<Response> {
  const response = await fetch(`${apiUrl}${path}`, init);
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(`${init.method || 'GET'} ${path}: esperado ${expectedStatus}, recibido ${response.status}: ${body.slice(0, 240)}`);
  }
  return response;
}

async function json(path: string, init: RequestInit = {}, expectedStatus = 200): Promise<any> {
  return (await request(path, init, expectedStatus)).json();
}

function authHeaders(token: string, contextId: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'X-Organizacion-Empresa-Id': contextId,
  };
}

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { activa: true } });
  if (!empresa) throw new Error('No existe una empresa activa de desarrollo');

  const ids = {
    orgA: randomUUID(), orgB: randomUUID(), linkA: randomUUID(), linkB: randomUUID(),
    memberA: randomUUID(), memberB: randomUUID(), userA: randomUUID(), userB: randomUUID(),
    accessA: randomUUID(), accessB: randomUUID(), checklistA: randomUUID(), checklistB: randomUUID(),
  };
  const emailA = `e2e-a-${ids.userA}@seh.local`;
  const emailB = `e2e-b-${ids.userB}@seh.local`;
  const passwordHash = await bcrypt.hash(password, 10);
  const inspectionIds: string[] = [];
  const checklistIds = [ids.checklistA, ids.checklistB];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.organizacion.createMany({ data: [
        { id: ids.orgA, nombre: 'E2E Consultora A', tipo: 'CONSULTORA' },
        { id: ids.orgB, nombre: 'E2E Consultora B', tipo: 'CONSULTORA' },
      ] });
      await tx.organizacionEmpresa.createMany({ data: [
        { id: ids.linkA, organizacionId: ids.orgA, empresaId: empresa.id },
        { id: ids.linkB, organizacionId: ids.orgB, empresaId: empresa.id },
      ] });
      await tx.usuario.createMany({ data: [
        { id: ids.userA, email: emailA, password: passwordHash, nombre: 'E2E', apellido: 'Consultora A', rol: Rol.TECNICO, empresaId: empresa.id },
        { id: ids.userB, email: emailB, password: passwordHash, nombre: 'E2E', apellido: 'Consultora B', rol: Rol.TECNICO, empresaId: empresa.id },
      ] });
      await tx.organizacionMiembro.createMany({ data: [
        { id: ids.memberA, organizacionId: ids.orgA, usuarioId: ids.userA, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
        { id: ids.memberB, organizacionId: ids.orgB, usuarioId: ids.userB, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      ] });
      await tx.accesoEmpresa.createMany({ data: [
        { id: ids.accessA, organizacionEmpresaId: ids.linkA, organizacionMiembroId: ids.memberA, organizacionId: ids.orgA, empresaId: empresa.id, rol: Rol.TECNICO },
        { id: ids.accessB, organizacionEmpresaId: ids.linkB, organizacionMiembroId: ids.memberB, organizacionId: ids.orgB, empresaId: empresa.id, rol: Rol.TECNICO },
      ] });
      await tx.checklist.create({
        data: { id: ids.checklistA, nombre: 'E2E Checklist A', tipo: TipoChecklist.GENERAL, empresaId: empresa.id, organizacionEmpresaId: ids.linkA, items: { create: [{ descripcion: 'Item A', orden: 1 }] } },
      });
      await tx.checklist.create({
        data: { id: ids.checklistB, nombre: 'E2E Checklist B', tipo: TipoChecklist.GENERAL, empresaId: empresa.id, organizacionEmpresaId: ids.linkB, items: { create: [{ descripcion: 'Item B', orden: 1 }] } },
      });
    });

    const loginA = await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailA, password }) });
    const loginB = await json('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailB, password }) });
    const headersA = authHeaders(loginA.accessToken, ids.linkA);
    const headersB = authHeaders(loginB.accessToken, ids.linkB);

    const contextsA = await json('/auth/contextos', { headers: headersA });
    const contextsB = await json('/auth/contextos', { headers: headersB });
    if (!contextsA.some((context: any) => context.organizacionEmpresaId === ids.linkA) || !contextsB.some((context: any) => context.organizacionEmpresaId === ids.linkB)) {
      throw new Error('Los usuarios no recibieron su contexto autorizado');
    }

    const checklistsA = await json('/checklists', { headers: headersA });
    const checklistsB = await json('/checklists', { headers: headersB });
    if (checklistsA.some((checklist: any) => checklist.id === ids.checklistB) || checklistsB.some((checklist: any) => checklist.id === ids.checklistA)) {
      throw new Error('Se detectó cruce de checklists');
    }

    const inspectionA = await json('/inspecciones', { method: 'POST', headers: { ...headersA, 'Content-Type': 'application/json' }, body: JSON.stringify({ checklistId: ids.checklistA, sector: 'E2E A' }) }, 201);
    const inspectionB = await json('/inspecciones', { method: 'POST', headers: { ...headersB, 'Content-Type': 'application/json' }, body: JSON.stringify({ checklistId: ids.checklistB, sector: 'E2E B' }) }, 201);
    inspectionIds.push(inspectionA.id, inspectionB.id);

    const crossContext = await request(`/inspecciones/${inspectionB.id}`, { headers: headersA }, 404);
    if (crossContext.status !== 404) throw new Error('El acceso cruzado a inspección no fue rechazado');

    const hallazgoA = await json('/hallazgos', { method: 'POST', headers: { ...headersA, 'Content-Type': 'application/json' }, body: JSON.stringify({ inspeccionId: inspectionA.id, titulo: 'Hallazgo A', descripcion: 'Hallazgo aislado de A', nivelRiesgo: 'MEDIO', ubicacionTexto: 'Sector A' }) }, 201);
    const hallazgoB = await json('/hallazgos', { method: 'POST', headers: { ...headersB, 'Content-Type': 'application/json' }, body: JSON.stringify({ inspeccionId: inspectionB.id, titulo: 'Hallazgo B', descripcion: 'Hallazgo aislado de B', nivelRiesgo: 'MEDIO', ubicacionTexto: 'Sector B' }) }, 201);

    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-png')], { type: 'image/png' }), 'e2e.png');
    const photo = await json(`/hallazgos/${hallazgoA.id}/fotos`, { method: 'POST', headers: authHeaders(loginA.accessToken, ids.linkA), body: form }, 201);
    const filename = JSON.parse(photo.fotosUrls).map((value: string) => value.split('/').pop()).pop();
    await request(`/hallazgos/${hallazgoA.id}/fotos/${filename}`, { headers: headersA });
    await request(`/hallazgos/${hallazgoA.id}/fotos/${filename}`, { headers: headersB }, 404);
    await request(`/reportes/inspecciones/${inspectionA.id}/pdf`, { headers: headersA });
    await request(`/reportes/inspecciones/${inspectionA.id}/pdf`, { headers: headersB }, 404);
    await request(`/checklists/${ids.checklistB}`, { headers: headersA }, 404);
    await request('/checklists', { method: 'GET', headers: headersA, }).then(async () => undefined);
    await request('/checklists', { headers: { ...headersA, 'X-Organizacion-Empresa-Id': ids.linkB } }, 403);

    console.log('OK: e2e HTTP multiempresa pasó login, contextos, checklists, inspecciones, hallazgos, fotografía, PDF y accesos cruzados.');
    void hallazgoB;
  } finally {
    await prisma.$transaction([
      prisma.inspeccion.deleteMany({ where: { id: { in: inspectionIds } } }),
      prisma.checklist.deleteMany({ where: { id: { in: checklistIds } } }),
      prisma.accesoEmpresa.deleteMany({ where: { id: { in: [ids.accessA, ids.accessB] } } }),
      prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.memberA, ids.memberB] } } }),
      prisma.organizacionEmpresa.deleteMany({ where: { id: { in: [ids.linkA, ids.linkB] } } }),
      prisma.organizacion.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } }),
      prisma.usuario.deleteMany({ where: { id: { in: [ids.userA, ids.userB] } } }),
    ]);
  }
}

main().catch((error) => {
  console.error('E2E multiempresa falló:', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
