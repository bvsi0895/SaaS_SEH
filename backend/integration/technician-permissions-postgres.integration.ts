import { strict as assert } from 'node:assert';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion, EstadoRelacionEmpresa, EstadoInspeccion, NivelRiesgo } from '@prisma/client';
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';
import { AccionesCorrectivasService } from '../src/acciones-correctivas/acciones-correctivas.service';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';
import { TenancyService } from '../src/tenancy/tenancy.service';

const prisma = new PrismaClient();
const tenancy = new TenancyService(prisma as never);
const inspections = new InspeccionesService(prisma as never, tenancy);
const actions = new AccionesCorrectivasService(prisma as never, tenancy);
const findings = new HallazgosService(prisma as never, tenancy);

const ids = {
  empresa: '00000000-0000-0000-0000-000000000401',
  organizacionA: '00000000-0000-0000-0000-000000000402',
  organizacionB: '00000000-0000-0000-0000-000000000403',
  relacionA: '00000000-0000-0000-0000-000000000404',
  relacionB: '00000000-0000-0000-0000-000000000405',
  usuarioA: '00000000-0000-0000-0000-000000000406',
  usuarioB: '00000000-0000-0000-0000-000000000407',
  membresiaA: '00000000-0000-0000-0000-000000000408',
  membresiaB: '00000000-0000-0000-0000-000000000409',
  accesoA: '00000000-0000-0000-0000-000000000410',
  accesoB: '00000000-0000-0000-0000-000000000411',
  checklist: '00000000-0000-0000-0000-000000000412',
  checklistItem: '00000000-0000-0000-0000-000000000413',
  establecimiento: '00000000-0000-0000-0000-000000000422',
  inspeccionA: '00000000-0000-0000-0000-000000000414',
  inspeccionB: '00000000-0000-0000-0000-000000000415',
  hallazgoA: '00000000-0000-0000-0000-000000000416',
  hallazgoB: '00000000-0000-0000-0000-000000000417',
  accionA: '00000000-0000-0000-0000-000000000418',
  accionB: '00000000-0000-0000-0000-000000000419',
  hallazgoC: '00000000-0000-0000-0000-000000000420',
  accionC: '00000000-0000-0000-0000-000000000421',
};

async function cleanup() {
  await prisma.accionCorrectiva.deleteMany({ where: { id: { in: [ids.accionA, ids.accionB, ids.accionC] } } });
  await prisma.hallazgo.deleteMany({ where: { id: { in: [ids.hallazgoA, ids.hallazgoB, ids.hallazgoC] } } });
  await prisma.inspeccionItem.deleteMany({ where: { inspeccionId: { in: [ids.inspeccionA, ids.inspeccionB] } } });
  await prisma.inspeccion.deleteMany({ where: { id: { in: [ids.inspeccionA, ids.inspeccionB] } } });
  await prisma.checklistItem.deleteMany({ where: { id: ids.checklistItem } });
  await prisma.checklist.deleteMany({ where: { id: ids.checklist } });
  await prisma.accesoEstablecimiento.deleteMany({
    where: {
      accesoEmpresaId: { in: [ids.accesoA, ids.accesoB] },
      establecimientoId: ids.establecimiento,
    },
  });
  await prisma.establecimiento.deleteMany({ where: { id: ids.establecimiento } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: { in: [ids.accesoA, ids.accesoB] } } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.membresiaA, ids.membresiaB] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.usuarioA, ids.usuarioB] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: { in: [ids.relacionA, ids.relacionB] } } });
  await prisma.organizacion.deleteMany({ where: { id: { in: [ids.organizacionA, ids.organizacionB] } } });
  await prisma.empresa.deleteMany({ where: { id: ids.empresa } });
}

async function mustReject(operation: Promise<unknown>, message: string) {
  await assert.rejects(operation, /no encontrad[oa]/i, message);
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.create({ data: { id: ids.empresa, nombre: 'Permissions test company' } });
    await prisma.organizacion.createMany({ data: [
      { id: ids.organizacionA, nombre: 'Consultora A', tipo: TipoOrganizacion.CONSULTORA },
      { id: ids.organizacionB, nombre: 'Consultora B', tipo: TipoOrganizacion.CONSULTORA },
    ] });
    await prisma.organizacionEmpresa.createMany({ data: [
      { id: ids.relacionA, organizacionId: ids.organizacionA, empresaId: ids.empresa, estado: EstadoRelacionEmpresa.ACTIVA },
      { id: ids.relacionB, organizacionId: ids.organizacionB, empresaId: ids.empresa, estado: EstadoRelacionEmpresa.ACTIVA },
    ] });
    await prisma.establecimiento.create({ data: { id: ids.establecimiento, empresaId: ids.empresa, nombre: 'Permissions site' } });
    await prisma.usuario.createMany({ data: [
      { id: ids.usuarioA, email: 'tech-a-permissions@seh.test', password: 'hash', nombre: 'Tech', apellido: 'A', rol: Rol.TECNICO, empresaId: ids.empresa },
      { id: ids.usuarioB, email: 'tech-b-permissions@seh.test', password: 'hash', nombre: 'Tech', apellido: 'B', rol: Rol.TECNICO, empresaId: ids.empresa },
    ] });
    await prisma.organizacionMiembro.createMany({ data: [
      { id: ids.membresiaA, organizacionId: ids.organizacionA, usuarioId: ids.usuarioA, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.membresiaB, organizacionId: ids.organizacionB, usuarioId: ids.usuarioB, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
    ] });
    await prisma.accesoEmpresa.createMany({ data: [
      { id: ids.accesoA, organizacionEmpresaId: ids.relacionA, organizacionMiembroId: ids.membresiaA, organizacionId: ids.organizacionA, empresaId: ids.empresa, rol: Rol.TECNICO },
      { id: ids.accesoB, organizacionEmpresaId: ids.relacionB, organizacionMiembroId: ids.membresiaB, organizacionId: ids.organizacionB, empresaId: ids.empresa, rol: Rol.TECNICO },
    ] });
    await prisma.accesoEstablecimiento.create({ data: { accesoEmpresaId: ids.accesoA, establecimientoId: ids.establecimiento, empresaId: ids.empresa } });
    await prisma.checklist.create({ data: { id: ids.checklist, nombre: 'Permissions checklist', organizacionId: ids.organizacionA, items: { create: { id: ids.checklistItem, descripcion: 'Item', orden: 1 } } } });
    await prisma.inspeccion.createMany({ data: [
      { id: ids.inspeccionA, sector: 'A', empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, establecimientoId: ids.establecimiento, checklistId: ids.checklist, usuarioId: ids.usuarioA, creadoPorId: ids.usuarioA, asignadoAId: ids.usuarioA, estado: EstadoInspeccion.EN_PROGRESO },
      { id: ids.inspeccionB, sector: 'B', empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, establecimientoId: ids.establecimiento, checklistId: ids.checklist, usuarioId: ids.usuarioB, creadoPorId: ids.usuarioB, asignadoAId: ids.usuarioB, estado: EstadoInspeccion.EN_PROGRESO },
    ] });
    await prisma.hallazgo.createMany({ data: [
      { id: ids.hallazgoA, titulo: 'Finding A', descripcion: 'Finding owned by technician A', nivelRiesgo: NivelRiesgo.ALTO, ubicacionTexto: 'A', inspeccionId: ids.inspeccionA },
      { id: ids.hallazgoB, titulo: 'Finding B', descripcion: 'Finding owned by technician B', nivelRiesgo: NivelRiesgo.MEDIO, ubicacionTexto: 'B', inspeccionId: ids.inspeccionB },
      { id: ids.hallazgoC, titulo: 'Finding C', descripcion: 'Finding owned by technician B and assigned to A', nivelRiesgo: NivelRiesgo.BAJO, ubicacionTexto: 'C', inspeccionId: ids.inspeccionB },
    ] });
    await prisma.accionCorrectiva.createMany({ data: [
      { id: ids.accionA, descripcion: 'Action assigned to technician A', fechaCompromiso: new Date(Date.now() + 86400000), empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, hallazgoId: ids.hallazgoA, creadorId: ids.usuarioA, responsableId: ids.usuarioA },
      { id: ids.accionB, descripcion: 'Action assigned to technician B', fechaCompromiso: new Date(Date.now() + 86400000), empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, hallazgoId: ids.hallazgoB, creadorId: ids.usuarioB, responsableId: ids.usuarioB },
      { id: ids.accionC, descripcion: 'Action for B finding assigned to A', fechaCompromiso: new Date(Date.now() + 86400000), empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, hallazgoId: ids.hallazgoC, creadorId: ids.usuarioB, responsableId: ids.usuarioA },
    ] });

    const visibleInspections = await inspections.findAll(ids.empresa, { usuarioId: ids.usuarioA }, ids.relacionA, Rol.TECNICO, ids.usuarioA, ids.accesoA);
    assert.deepEqual(visibleInspections.map((row) => row.id), [ids.inspeccionA]);
    await mustReject(inspections.findOne(ids.inspeccionB, ids.empresa, ids.relacionA, ids.usuarioA, Rol.TECNICO, ids.accesoA), 'technician A must not open B inspection');

    const visibleActions = await actions.findMine(ids.usuarioA, ids.empresa, undefined, ids.relacionA, ids.accesoA);
    assert.deepEqual(visibleActions.map((row) => row.id).sort(), [ids.accionA, ids.accionC].sort());
    assert.equal(visibleActions.find((row) => row.id === ids.accionA)?.responsable?.id, ids.usuarioA);
    await mustReject(actions.findOne(ids.accionB, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'technician A must not open B action');
    await mustReject(actions.iniciar(ids.accionB, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'technician A must not start B action');
    await actions.iniciar(ids.accionA, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA);
    await actions.cerrar(ids.accionA, { notasCierre: 'done' }, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA);

    const visibleFindings = await findings.findAll(ids.empresa, undefined, ids.relacionA, ids.usuarioA, ids.accesoA);
    assert.deepEqual(visibleFindings.map((row) => row.id).sort(), [ids.hallazgoA, ids.hallazgoC].sort());
    const assignedFinding = visibleFindings.find((row) => row.id === ids.hallazgoC);
    assert.equal(assignedFinding?.inspeccion.usuario.id, ids.usuarioB);
    assert.equal(assignedFinding?.accionesCorrectivas[0]?.responsable?.id, ids.usuarioA);
    await expectReadOnlyAssignedFinding();
    await mustReject(findings.findOne(ids.hallazgoB, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'technician A must not open B finding');
    console.log('PostgreSQL integration passed: technician ownership, assigned actions, findings, and organization isolation');
  } finally {
    await cleanup();
  }
}

async function expectReadOnlyAssignedFinding() {
  await assert.doesNotReject(findings.findOne(ids.hallazgoC, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA));
  await mustReject(findings.update(ids.hallazgoC, { titulo: 'unauthorized' }, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'assigned technician must not update another technician finding');
  await mustReject(findings.remove(ids.hallazgoC, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'assigned technician must not delete another technician finding');
  await mustReject(findings.addPhoto(ids.hallazgoC, ids.empresa, { buffer: Buffer.from('invalid'), originalname: 'evidence.jpg' }, ids.relacionA, ids.usuarioA, ids.accesoA), 'assigned technician must not add evidence to another technician finding');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

