import { strict as assert } from 'node:assert';
import {
  EstadoInspeccion,
  EstadoRelacionEmpresa,
  NivelRiesgo,
  PrismaClient,
  Rol,
  RolOrganizacion,
  TipoChecklist,
  TipoOrganizacion,
} from '@prisma/client';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';
import { TenancyService } from '../src/tenancy/tenancy.service';

const prisma = new PrismaClient();
const tenancy = new TenancyService(prisma as never);
const inspections = new InspeccionesService(prisma as never, tenancy);
const findings = new HallazgosService(prisma as never, tenancy);
const jwtStrategy = new JwtStrategy({ get: () => 'integration-secret' } as never, prisma as never);

const ids = {
  empresa: '00000000-0000-0000-0000-000000000601',
  organizacionA: '00000000-0000-0000-0000-000000000602',
  organizacionB: '00000000-0000-0000-0000-000000000603',
  relacionA: '00000000-0000-0000-0000-000000000604',
  relacionB: '00000000-0000-0000-0000-000000000605',
  usuarioA: '00000000-0000-0000-0000-000000000606',
  usuarioB: '00000000-0000-0000-0000-000000000607',
  usuarioMulti: '00000000-0000-0000-0000-000000000608',
  miembroA: '00000000-0000-0000-0000-000000000609',
  miembroB: '00000000-0000-0000-0000-000000000610',
  miembroMultiA: '00000000-0000-0000-0000-000000000611',
  miembroMultiB: '00000000-0000-0000-0000-000000000612',
  accesoA: '00000000-0000-0000-0000-000000000613',
  accesoB: '00000000-0000-0000-0000-000000000614',
  accesoMultiA: '00000000-0000-0000-0000-000000000615',
  accesoMultiB: '00000000-0000-0000-0000-000000000616',
  establecimientoA: '00000000-0000-0000-0000-000000000617',
  establecimientoB: '00000000-0000-0000-0000-000000000618',
  checklistA: '00000000-0000-0000-0000-000000000619',
  checklistB: '00000000-0000-0000-0000-000000000620',
  checklistItemA: '00000000-0000-0000-0000-000000000621',
  checklistItemB: '00000000-0000-0000-0000-000000000622',
};

async function cleanup() {
  await prisma.inspeccion.deleteMany({ where: { empresaId: ids.empresa } });
  await prisma.checklist.deleteMany({ where: { id: { in: [ids.checklistA, ids.checklistB] } } });
  await prisma.accesoEstablecimiento.deleteMany({ where: { accesoEmpresaId: { in: [ids.accesoA, ids.accesoB, ids.accesoMultiA, ids.accesoMultiB] } } });
  await prisma.establecimiento.deleteMany({ where: { id: { in: [ids.establecimientoA, ids.establecimientoB] } } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: { in: [ids.accesoA, ids.accesoB, ids.accesoMultiA, ids.accesoMultiB] } } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.miembroA, ids.miembroB, ids.miembroMultiA, ids.miembroMultiB] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.usuarioA, ids.usuarioB, ids.usuarioMulti] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: { in: [ids.relacionA, ids.relacionB] } } });
  await prisma.organizacion.deleteMany({ where: { id: { in: [ids.organizacionA, ids.organizacionB] } } });
  await prisma.empresa.deleteMany({ where: { id: ids.empresa } });
}

async function mustReject(operation: Promise<unknown>, message: string) {
  await assert.rejects(operation, /no (existe|encontrad)|no tiene acceso|no está autorizado/i, message);
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.create({ data: { id: ids.empresa, nombre: 'PR28 shared company' } });
    await prisma.organizacion.createMany({ data: [
      { id: ids.organizacionA, nombre: 'PR28 Consultora A', tipo: TipoOrganizacion.CONSULTORA },
      { id: ids.organizacionB, nombre: 'PR28 Consultora B', tipo: TipoOrganizacion.CONSULTORA },
    ] });
    await prisma.organizacionEmpresa.createMany({ data: [
      { id: ids.relacionA, organizacionId: ids.organizacionA, empresaId: ids.empresa },
      { id: ids.relacionB, organizacionId: ids.organizacionB, empresaId: ids.empresa },
    ] });
    await prisma.establecimiento.createMany({ data: [
      { id: ids.establecimientoA, empresaId: ids.empresa, nombre: 'PR28 site A' },
      { id: ids.establecimientoB, empresaId: ids.empresa, nombre: 'PR28 site B' },
    ] });
    await prisma.usuario.createMany({ data: [
      { id: ids.usuarioA, email: 'pr28-a@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'A', rol: Rol.TECNICO, empresaId: ids.empresa },
      { id: ids.usuarioB, email: 'pr28-b@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'B', rol: Rol.TECNICO, empresaId: ids.empresa },
      // Global role is deliberately different from the role in relation B.
      { id: ids.usuarioMulti, email: 'pr28-multi@seh.test', password: 'hash', nombre: 'Usuario', apellido: 'Multiempresa', rol: Rol.ADMIN_EMPRESA, empresaId: ids.empresa },
    ] });
    await prisma.organizacionMiembro.createMany({ data: [
      { id: ids.miembroA, organizacionId: ids.organizacionA, usuarioId: ids.usuarioA, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.miembroB, organizacionId: ids.organizacionB, usuarioId: ids.usuarioB, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.miembroMultiA, organizacionId: ids.organizacionA, usuarioId: ids.usuarioMulti, rol: RolOrganizacion.ADMIN_ORGANIZACION },
      { id: ids.miembroMultiB, organizacionId: ids.organizacionB, usuarioId: ids.usuarioMulti, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
    ] });
    await prisma.accesoEmpresa.createMany({ data: [
      { id: ids.accesoA, organizacionEmpresaId: ids.relacionA, organizacionMiembroId: ids.miembroA, organizacionId: ids.organizacionA, empresaId: ids.empresa, rol: Rol.TECNICO },
      { id: ids.accesoB, organizacionEmpresaId: ids.relacionB, organizacionMiembroId: ids.miembroB, organizacionId: ids.organizacionB, empresaId: ids.empresa, rol: Rol.TECNICO },
      { id: ids.accesoMultiA, organizacionEmpresaId: ids.relacionA, organizacionMiembroId: ids.miembroMultiA, organizacionId: ids.organizacionA, empresaId: ids.empresa, rol: Rol.ADMIN_EMPRESA },
      { id: ids.accesoMultiB, organizacionEmpresaId: ids.relacionB, organizacionMiembroId: ids.miembroMultiB, organizacionId: ids.organizacionB, empresaId: ids.empresa, rol: Rol.TECNICO },
    ] });
    await prisma.accesoEstablecimiento.createMany({ data: [
      { accesoEmpresaId: ids.accesoA, establecimientoId: ids.establecimientoA, empresaId: ids.empresa },
      { accesoEmpresaId: ids.accesoB, establecimientoId: ids.establecimientoB, empresaId: ids.empresa },
      { accesoEmpresaId: ids.accesoMultiB, establecimientoId: ids.establecimientoB, empresaId: ids.empresa },
    ] });
    await prisma.checklist.create({ data: { id: ids.checklistA, nombre: 'PR28 checklist A', tipo: TipoChecklist.GENERAL, empresaId: ids.empresa, organizacionEmpresaId: ids.relacionA, items: { create: { id: ids.checklistItemA, descripcion: 'Item A', orden: 1 } } } });
    await prisma.checklist.create({ data: { id: ids.checklistB, nombre: 'PR28 checklist B', tipo: TipoChecklist.GENERAL, empresaId: ids.empresa, organizacionEmpresaId: ids.relacionB, items: { create: { id: ids.checklistItemB, descripcion: 'Item B', orden: 1 } } } });

    const contextA = await tenancy.resolveForUser(ids.usuarioMulti, ids.empresa, ids.relacionA);
    const contextB = await tenancy.resolveForUser(ids.usuarioMulti, ids.empresa, ids.relacionB);
    assert.equal(contextA.rol, Rol.ADMIN_EMPRESA, 'el rol debe ser el del acceso A');
    assert.equal(contextB.rol, Rol.TECNICO, 'el rol debe ser el del acceso B, no Usuario.rol');

    const inspectionA = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establecimientoA, sector: 'Sector A' }, ids.usuarioA, ids.empresa, ids.relacionA, Rol.TECNICO, ids.accesoA);
    const inspectionB = await inspections.create({ checklistId: ids.checklistB, establecimientoId: ids.establecimientoB, sector: 'Sector B' }, ids.usuarioB, ids.empresa, ids.relacionB, Rol.TECNICO, ids.accesoB);
    assert.equal(inspectionA.estado, EstadoInspeccion.EN_PROGRESO);
    assert.equal(inspectionB.estado, EstadoInspeccion.EN_PROGRESO);

    const findingA = await findings.create({ inspeccionId: inspectionA.id, titulo: 'Hallazgo de A', descripcion: 'Hallazgo aislado de consultora A', nivelRiesgo: NivelRiesgo.MEDIO, ubicacionTexto: 'Sector A' }, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA);
    const findingB = await findings.create({ inspeccionId: inspectionB.id, titulo: 'Hallazgo de B', descripcion: 'Hallazgo aislado de consultora B', nivelRiesgo: NivelRiesgo.MEDIO, ubicacionTexto: 'Sector B' }, ids.empresa, ids.relacionB, ids.usuarioB, ids.accesoB);
    assert.notEqual(findingA.id, findingB.id);

    await mustReject(inspections.findOne(inspectionB.id, ids.empresa, ids.relacionA, ids.usuarioA, Rol.TECNICO, ids.accesoA), 'A no debe abrir inspecciones de B');
    await mustReject(findings.findOne(findingB.id, ids.empresa, ids.relacionA, ids.usuarioA, ids.accesoA), 'A no debe abrir hallazgos de B');
    await mustReject(inspections.findOne(inspectionA.id, ids.empresa, ids.relacionB, ids.usuarioB, Rol.TECNICO, ids.accesoB), 'B no debe abrir inspecciones de A');
    await mustReject(findings.findOne(findingA.id, ids.empresa, ids.relacionB, ids.usuarioB, ids.accesoB), 'B no debe abrir hallazgos de A');
    assert.deepEqual((await inspections.findAll(ids.empresa, undefined, ids.relacionA, Rol.ADMIN_EMPRESA, ids.usuarioMulti, ids.accesoMultiA)).map((item) => item.id), [inspectionA.id]);

    await mustReject(inspections.create({ checklistId: ids.checklistB, establecimientoId: ids.establecimientoA, sector: 'Establecimiento no autorizado' }, ids.usuarioMulti, ids.empresa, ids.relacionB, Rol.TECNICO, ids.accesoMultiB), 'el técnico no debe usar otro establecimiento');
    await mustReject(tenancy.getEstablishmentScope(ids.accesoA, ids.empresa, ids.relacionB), 'no debe poder combinar acceso y relación manipulados');

    const oldTokenPayload = { sub: ids.usuarioMulti, email: 'pr28-multi@seh.test', empresaId: ids.empresa, rol: Rol.ADMIN_EMPRESA, organizacionEmpresaId: ids.relacionA };
    const validatedTokenUser = await jwtStrategy.validate(oldTokenPayload);
    assert.equal(validatedTokenUser.id, ids.usuarioMulti);

    await prisma.organizacionEmpresa.update({ where: { id: ids.relacionA }, data: { estado: EstadoRelacionEmpresa.SUSPENDIDA } });
    await assert.rejects(tenancy.resolveForUser(ids.usuarioMulti, ids.empresa, ids.relacionA), /acceso activo/i, 'una relación suspendida debe rechazar el contexto');
    await assert.rejects(tenancy.resolveForUser(ids.usuarioA, ids.empresa, ids.relacionA), /acceso activo/i, 'un token/contexto de A no debe seguir operativo');
    await assert.doesNotReject(tenancy.resolveForUser(ids.usuarioB, ids.empresa, ids.relacionB), 'la suspensión de A no debe afectar B');
    assert.equal(await prisma.inspeccion.count({ where: { id: inspectionA.id } }), 1, 'la suspensión no debe borrar históricos');

    await prisma.organizacionEmpresa.update({ where: { id: ids.relacionA }, data: { estado: EstadoRelacionEmpresa.REVOCADA } });
    await assert.rejects(tenancy.resolveForUser(ids.usuarioMulti, ids.empresa, ids.relacionA), /acceso activo/i, 'una relación revocada debe rechazar el contexto');
    assert.equal((await jwtStrategy.validate(oldTokenPayload)).id, ids.usuarioMulti, 'la validación básica del JWT no debe reactivar el acceso revocado');

    await prisma.organizacionEmpresa.update({ where: { id: ids.relacionA }, data: { estado: EstadoRelacionEmpresa.ACTIVA } });
    const reactivated = await tenancy.resolveForUser(ids.usuarioMulti, ids.empresa, ids.relacionA);
    assert.equal(reactivated.rol, Rol.ADMIN_EMPRESA, 'la relación reactivada debe recuperar su rol contextual');

    console.log('PR28 PostgreSQL integration passed: consultora isolation, contextual roles, suspension/reactivation, revoked contexts, establishment scope, manipulated IDs, and historical preservation');
  } finally {
    await cleanup();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
