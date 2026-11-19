import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { rm, stat } from 'fs/promises';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion, EstadoRelacionEmpresa, EstadoInspeccion, NivelRiesgo } from '@prisma/client';
const sharp = require('sharp') as any;
import { AdministracionService } from '../src/administracion/administracion.service';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';
import { ReportesService } from '../src/reportes/reportes.service';

const prisma = new PrismaClient();
const administration = new AdministracionService(prisma as never);
const findings = new HallazgosService(prisma as never);
const reports = new ReportesService(prisma as never, findings);
const uploadDir = '.test-uploads-logo-report';

const ids = {
  empresa: '00000000-0000-0000-0000-000000000801',
  organizacionA: '00000000-0000-0000-0000-000000000802',
  organizacionB: '00000000-0000-0000-0000-000000000803',
  contextoA: '00000000-0000-0000-0000-000000000804',
  adminA: '00000000-0000-0000-0000-000000000805',
  adminB: '00000000-0000-0000-0000-000000000806',
  memberA: '00000000-0000-0000-0000-000000000807',
  memberB: '00000000-0000-0000-0000-000000000808',
  accessA: '00000000-0000-0000-0000-000000000809',
  checklist: '00000000-0000-0000-0000-000000000810',
  checklistItem: '00000000-0000-0000-0000-000000000811',
  inspeccion: '00000000-0000-0000-0000-000000000812',
  hallazgo: '00000000-0000-0000-0000-000000000813',
};

async function cleanup() {
  await prisma.accionCorrectiva.deleteMany({ where: { hallazgo: { id: ids.hallazgo } } });
  await prisma.hallazgo.deleteMany({ where: { id: ids.hallazgo } });
  await prisma.inspeccion.deleteMany({ where: { id: ids.inspeccion } });
  await prisma.checklistItem.deleteMany({ where: { id: ids.checklistItem } });
  await prisma.checklist.deleteMany({ where: { id: ids.checklist } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: ids.accessA } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.memberA, ids.memberB] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: ids.contextoA } });
  await prisma.organizacion.deleteMany({ where: { id: { in: [ids.organizacionA, ids.organizacionB] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.adminA, ids.adminB] } } });
  await prisma.empresa.deleteMany({ where: { id: ids.empresa } });
  await rm(uploadDir, { recursive: true, force: true });
}

async function logoBetweenOnePointFiveAndTwoMiB() {
  const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: 'orange' } }).jpeg({ quality: 90 }).toBuffer();
  const padded = Buffer.concat([jpeg, randomBytes(1_600_000 - jpeg.length)]);
  assert.ok(padded.length > 1_500_000 && padded.length <= 2 * 1024 * 1024);
  return padded;
}

async function main() {
  process.env.UPLOAD_DIR = uploadDir;
  await cleanup();
  try {
    const logo = await logoBetweenOnePointFiveAndTwoMiB();
    await prisma.empresa.create({ data: { id: ids.empresa, nombre: 'Logo report test company' } });
    await prisma.organizacion.create({ data: { id: ids.organizacionA, nombre: 'Logo report organization A', tipo: TipoOrganizacion.CONSULTORA } });
    await prisma.organizacion.create({ data: { id: ids.organizacionB, nombre: 'Logo report organization B', tipo: TipoOrganizacion.CONSULTORA } });
    await prisma.organizacionEmpresa.create({ data: { id: ids.contextoA, organizacionId: ids.organizacionA, empresaId: ids.empresa, estado: EstadoRelacionEmpresa.ACTIVA } });
    await prisma.usuario.createMany({ data: [
      { id: ids.adminA, email: 'logo-report-admin-a@seh.test', password: 'hash', nombre: 'Admin', apellido: 'A', rol: Rol.ADMIN_EMPRESA, empresaId: ids.empresa },
      { id: ids.adminB, email: 'logo-report-admin-b@seh.test', password: 'hash', nombre: 'Admin', apellido: 'B', rol: Rol.ADMIN_EMPRESA, empresaId: ids.empresa },
    ] });
    await prisma.organizacionMiembro.createMany({ data: [
      { id: ids.memberA, organizacionId: ids.organizacionA, usuarioId: ids.adminA, rol: RolOrganizacion.ADMIN_ORGANIZACION },
      { id: ids.memberB, organizacionId: ids.organizacionB, usuarioId: ids.adminB, rol: RolOrganizacion.ADMIN_ORGANIZACION },
    ] });
    await prisma.accesoEmpresa.create({ data: { id: ids.accessA, organizacionEmpresaId: ids.contextoA, organizacionMiembroId: ids.memberA, organizacionId: ids.organizacionA, empresaId: ids.empresa, rol: Rol.ADMIN_EMPRESA } });

    const storedA = await administration.uploadLogo(ids.organizacionA, ids.adminA, { buffer: logo, originalname: 'logo-a.jpg', mimetype: 'image/jpeg' });
    assert.match(storedA.logoUrl || '', /\.test-uploads-logo-report[\\/]logos[\\/]00000000-0000-0000-0000-000000000802-/);
    const recoveredA = await administration.getLogo(ids.organizacionA, ids.adminA);
    assert.equal(recoveredA.contentType, 'image/png');
    assert.ok(recoveredA.buffer.length > 0);

    const storedB = await administration.uploadLogo(ids.organizacionB, ids.adminB, { buffer: logo, originalname: 'logo-b.jpg', mimetype: 'image/jpeg' });
    assert.notEqual(storedA.logoUrl, storedB.logoUrl);

    await prisma.checklist.create({ data: { id: ids.checklist, nombre: 'Logo report checklist', empresaId: ids.empresa, organizacionEmpresaId: ids.contextoA, items: { create: { id: ids.checklistItem, descripcion: 'Item de evidencia', orden: 1 } } } });
    await prisma.inspeccion.create({ data: {
      id: ids.inspeccion, sector: 'Producción', estado: EstadoInspeccion.EN_PROGRESO, fechaHoraInicio: new Date('2026-11-19T12:00:00Z'), empresaId: ids.empresa, organizacionEmpresaId: ids.contextoA, checklistId: ids.checklist, creadoPorId: ids.adminA, asignadoAId: ids.adminA, usuarioId: ids.adminA, items: { create: { checklistItemId: ids.checklistItem } },
    } });
    await prisma.hallazgo.create({ data: { id: ids.hallazgo, inspeccionId: ids.inspeccion, titulo: 'Evidencia aislada', descripcion: 'Hallazgo con fotografía', nivelRiesgo: NivelRiesgo.MEDIO, ubicacionTexto: 'Producción' } });
    const photo = await sharp({ create: { width: 80, height: 60, channels: 3, background: 'orange' } }).jpeg().toBuffer();
    const withPhoto = await findings.addPhoto(ids.hallazgo, ids.empresa, { buffer: photo, originalname: 'evidencia.jpg' }, ids.contextoA, ids.adminA);
    const photoPath = JSON.parse(withPhoto.fotosUrls || '[]')[0] as string;
    await prisma.inspeccion.update({ where: { id: ids.inspeccion }, data: { estado: EstadoInspeccion.COMPLETADA, fechaHoraFin: new Date('2026-11-19T13:00:00Z') } });

    const report = await reports.generarReporteMensualPDF({ empresaId: ids.empresa, organizacionEmpresaId: ids.contextoA, accesoEmpresaId: ids.accessA, fechaDesde: new Date('2026-11-01T00:00:00Z'), fechaHasta: new Date('2026-11-30T23:59:59Z') });
    assert.equal(report.subarray(0, 4).toString(), '%PDF');
    assert.ok((report.toString('latin1').match(/\/Subtype \/Image/g) || []).length >= 2, 'PDF debe contener logo y evidencia');

    const replacedA = await administration.uploadLogo(ids.organizacionA, ids.adminA, { buffer: logo, originalname: 'logo-a-reemplazo.jpg', mimetype: 'image/jpeg' });
    assert.notEqual(replacedA.logoUrl, storedA.logoUrl);
    await stat(require('path').join(process.cwd(), uploadDir, 'hallazgos', photoPath.split('/').pop()));
    await administration.deleteLogo(ids.organizacionA, ids.adminA);
    await stat(require('path').join(process.cwd(), uploadDir, 'hallazgos', photoPath.split('/').pop()));
    await administration.getLogo(ids.organizacionB, ids.adminB);
    console.log('Organization logo/report PostgreSQL integration passed: upload, recovery, PDF embedding, replacement/delete isolation, and evidence preservation');
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
