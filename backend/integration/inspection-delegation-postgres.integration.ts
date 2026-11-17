import { strict as assert } from 'node:assert';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion, EstadoRelacionEmpresa, EstadoInspeccion } from '@prisma/client';
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';

const prisma = new PrismaClient();
const service = new InspeccionesService(prisma as never);
const ids = {
  empresa: '00000000-0000-0000-0000-000000000501',
  empresaAjena: '00000000-0000-0000-0000-000000000502',
  organizacion: '00000000-0000-0000-0000-000000000503',
  contexto: '00000000-0000-0000-0000-000000000504',
  admin: '00000000-0000-0000-0000-000000000505',
  supervisor: '00000000-0000-0000-0000-000000000506',
  tecnicoA: '00000000-0000-0000-0000-000000000507',
  tecnicoB: '00000000-0000-0000-0000-000000000508',
  tecnicoAjeno: '00000000-0000-0000-0000-000000000509',
  memberAdmin: '00000000-0000-0000-0000-000000000510',
  memberSupervisor: '00000000-0000-0000-0000-000000000511',
  memberA: '00000000-0000-0000-0000-000000000512',
  memberB: '00000000-0000-0000-0000-000000000513',
  contextAccessAdmin: '00000000-0000-0000-0000-000000000514',
  contextAccessSupervisor: '00000000-0000-0000-0000-000000000515',
  contextAccessA: '00000000-0000-0000-0000-000000000516',
  contextAccessB: '00000000-0000-0000-0000-000000000517',
  checklist: '00000000-0000-0000-0000-000000000518',
  checklistItem: '00000000-0000-0000-0000-000000000519',
};

async function cleanup() {
  await prisma.inspeccionReasignacion.deleteMany({ where: { inspeccion: { empresaId: { in: [ids.empresa, ids.empresaAjena] } } } });
  await prisma.inspeccion.deleteMany({ where: { empresaId: { in: [ids.empresa, ids.empresaAjena] } } });
  await prisma.checklistItem.deleteMany({ where: { id: ids.checklistItem } });
  await prisma.checklist.deleteMany({ where: { id: ids.checklist } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: { in: [ids.contextAccessAdmin, ids.contextAccessSupervisor, ids.contextAccessA, ids.contextAccessB] } } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.memberAdmin, ids.memberSupervisor, ids.memberA, ids.memberB] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.admin, ids.supervisor, ids.tecnicoA, ids.tecnicoB, ids.tecnicoAjeno] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: ids.contexto } });
  await prisma.organizacion.deleteMany({ where: { id: ids.organizacion } });
  await prisma.empresa.deleteMany({ where: { id: { in: [ids.empresa, ids.empresaAjena] } } });
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.createMany({ data: [{ id: ids.empresa, nombre: 'Delegation company' }, { id: ids.empresaAjena, nombre: 'Other company' }] });
    await prisma.organizacion.create({ data: { id: ids.organizacion, nombre: 'Delegation organization', tipo: TipoOrganizacion.CONSULTORA } });
    await prisma.organizacionEmpresa.create({ data: { id: ids.contexto, organizacionId: ids.organizacion, empresaId: ids.empresa, estado: EstadoRelacionEmpresa.ACTIVA } });
    await prisma.usuario.createMany({ data: [
      { id: ids.admin, email: 'delegation-admin@seh.test', password: 'hash', nombre: 'Admin', apellido: 'Delegation', rol: Rol.ADMIN_EMPRESA, empresaId: ids.empresa },
      { id: ids.supervisor, email: 'delegation-supervisor@seh.test', password: 'hash', nombre: 'Supervisor', apellido: 'Delegation', rol: Rol.SUPERVISOR, empresaId: ids.empresa },
      { id: ids.tecnicoA, email: 'delegation-tech-a@seh.test', password: 'hash', nombre: 'Tech', apellido: 'A', rol: Rol.TECNICO, empresaId: ids.empresa },
      { id: ids.tecnicoB, email: 'delegation-tech-b@seh.test', password: 'hash', nombre: 'Tech', apellido: 'B', rol: Rol.TECNICO, empresaId: ids.empresa },
      { id: ids.tecnicoAjeno, email: 'delegation-tech-other@seh.test', password: 'hash', nombre: 'Tech', apellido: 'Other', rol: Rol.TECNICO, empresaId: ids.empresaAjena },
    ] });
    await prisma.organizacionMiembro.createMany({ data: [
      { id: ids.memberAdmin, organizacionId: ids.organizacion, usuarioId: ids.admin, rol: RolOrganizacion.ADMIN_ORGANIZACION },
      { id: ids.memberSupervisor, organizacionId: ids.organizacion, usuarioId: ids.supervisor, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.memberA, organizacionId: ids.organizacion, usuarioId: ids.tecnicoA, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.memberB, organizacionId: ids.organizacion, usuarioId: ids.tecnicoB, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
    ] });
    await prisma.accesoEmpresa.createMany({ data: [
      { id: ids.contextAccessAdmin, organizacionEmpresaId: ids.contexto, organizacionMiembroId: ids.memberAdmin, organizacionId: ids.organizacion, empresaId: ids.empresa, rol: Rol.ADMIN_EMPRESA },
      { id: ids.contextAccessSupervisor, organizacionEmpresaId: ids.contexto, organizacionMiembroId: ids.memberSupervisor, organizacionId: ids.organizacion, empresaId: ids.empresa, rol: Rol.SUPERVISOR },
      { id: ids.contextAccessA, organizacionEmpresaId: ids.contexto, organizacionMiembroId: ids.memberA, organizacionId: ids.organizacion, empresaId: ids.empresa, rol: Rol.TECNICO },
      { id: ids.contextAccessB, organizacionEmpresaId: ids.contexto, organizacionMiembroId: ids.memberB, organizacionId: ids.organizacion, empresaId: ids.empresa, rol: Rol.TECNICO },
    ] });
    await prisma.checklist.create({ data: { id: ids.checklist, nombre: 'Delegation checklist', empresaId: ids.empresa, organizacionEmpresaId: ids.contexto, items: { create: { id: ids.checklistItem, descripcion: 'Item', orden: 1 } } } });

    const adminDelegated = await service.create({ checklistId: ids.checklist, sector: 'Admin sector', asignadoAId: ids.tecnicoA }, ids.admin, ids.empresa, ids.contexto, Rol.ADMIN_EMPRESA);
    assert.equal(adminDelegated.estado, EstadoInspeccion.PENDIENTE, 'admin delegation must remain pending');
    const supervisorDelegated = await service.create({ checklistId: ids.checklist, sector: 'Supervisor sector', asignadoAId: ids.tecnicoB }, ids.supervisor, ids.empresa, ids.contexto, Rol.SUPERVISOR);
    assert.equal(supervisorDelegated.estado, EstadoInspeccion.PENDIENTE, 'supervisor delegation must remain pending');
    const technicianOwn = await service.create({ checklistId: ids.checklist, sector: 'Own sector' }, ids.tecnicoA, ids.empresa, ids.contexto, Rol.TECNICO);
    assert.equal(technicianOwn.asignadoAId, ids.tecnicoA);
    assert.equal(technicianOwn.estado, EstadoInspeccion.EN_PROGRESO);

    const assigned = await service.findAll(ids.empresa, undefined, ids.contexto, Rol.TECNICO, ids.tecnicoA);
    assert.deepEqual(assigned.map((inspection) => inspection.id).sort(), [adminDelegated.id, technicianOwn.id].sort());
    await assert.rejects(service.findOne(supervisorDelegated.id, ids.empresa, ids.contexto, ids.tecnicoA, Rol.TECNICO), /no encontrada/i);
    const started = await service.iniciar(adminDelegated.id, ids.empresa, ids.contexto, ids.tecnicoA, Rol.TECNICO);
    assert.equal(started.estado, EstadoInspeccion.EN_PROGRESO);

    const reassigned = await service.reasignar(supervisorDelegated.id, { asignadoAId: ids.tecnicoA }, ids.empresa, ids.contexto, ids.admin, Rol.ADMIN_EMPRESA);
    assert.equal(reassigned.asignadoAId, ids.tecnicoA);
    assert.equal(await prisma.inspeccionReasignacion.count({ where: { inspeccionId: supervisorDelegated.id, efectuadaPorId: ids.admin } }), 1);
    await assert.rejects(service.reasignar(supervisorDelegated.id, { asignadoAId: ids.tecnicoAjeno }, ids.empresa, ids.contexto, ids.admin, Rol.ADMIN_EMPRESA), /no está autorizado/i);
    console.log('PostgreSQL integration passed: admin/supervisor delegation, technician visibility/start, reassignment audit, and company isolation');
  } finally {
    await cleanup();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

