import { strict as assert } from 'node:assert';
import {
  EstadoInspeccion,
  EstadoRelacionEmpresa,
  PrismaClient,
  Rol,
  RolOrganizacion,
  TipoChecklist,
  TipoOrganizacion,
} from '@prisma/client';
import { ChecklistsService } from '../src/checklists/checklists.service';
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';
import { TenancyService } from '../src/tenancy/tenancy.service';

const prisma = new PrismaClient();
const tenancy = new TenancyService(prisma as never);
const checklists = new ChecklistsService(prisma as never);
const inspections = new InspeccionesService(prisma as never, tenancy);

const ids = {
  orgA: '00000000-0000-4000-8000-000000003001',
  orgB: '00000000-0000-4000-8000-000000003002',
  companyA: '00000000-0000-4000-8000-000000003003',
  companyB: '00000000-0000-4000-8000-000000003004',
  sharedCompany: '00000000-0000-4000-8000-000000003005',
  relationAA: '00000000-0000-4000-8000-000000003006',
  relationAB: '00000000-0000-4000-8000-000000003007',
  relationAShared: '00000000-0000-4000-8000-000000003008',
  relationBShared: '00000000-0000-4000-8000-000000003009',
  adminA: '00000000-0000-4000-8000-000000003010',
  techA: '00000000-0000-4000-8000-000000003011',
  techB: '00000000-0000-4000-8000-000000003012',
  memberAdminA: '00000000-0000-4000-8000-000000003013',
  memberTechA: '00000000-0000-4000-8000-000000003014',
  memberTechB: '00000000-0000-4000-8000-000000003015',
  accessAA: '00000000-0000-4000-8000-000000003016',
  accessAB: '00000000-0000-4000-8000-000000003017',
  accessAShared: '00000000-0000-4000-8000-000000003018',
  accessBShared: '00000000-0000-4000-8000-000000003019',
  accessSupervisorAA: '00000000-0000-4000-8000-000000003027',
  accessSupervisorAB: '00000000-0000-4000-8000-000000003028',
  establishmentA: '00000000-0000-4000-8000-000000003020',
  establishmentB: '00000000-0000-4000-8000-000000003021',
  establishmentShared: '00000000-0000-4000-8000-000000003022',
  checklistA: '00000000-0000-4000-8000-000000003023',
  checklistB: '00000000-0000-4000-8000-000000003024',
  itemA: '00000000-0000-4000-8000-000000003025',
  itemB: '00000000-0000-4000-8000-000000003026',
} as const;

async function cleanup() {
  await prisma.inspeccion.deleteMany({ where: { empresaId: { in: [ids.companyA, ids.companyB, ids.sharedCompany] } } });
  await prisma.checklist.deleteMany({ where: { id: { in: [ids.checklistA, ids.checklistB] } } });
  await prisma.accesoEstablecimiento.deleteMany({ where: { accesoEmpresaId: { in: [ids.accessAA, ids.accessAB, ids.accessAShared, ids.accessBShared] } } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: { in: [ids.accessAA, ids.accessAB, ids.accessAShared, ids.accessBShared, ids.accessSupervisorAA, ids.accessSupervisorAB] } } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: { in: [ids.memberAdminA, ids.memberTechA, ids.memberTechB] } } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.adminA, ids.techA, ids.techB] } } });
  await prisma.establecimiento.deleteMany({ where: { id: { in: [ids.establishmentA, ids.establishmentB, ids.establishmentShared] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: { in: [ids.relationAA, ids.relationAB, ids.relationAShared, ids.relationBShared] } } });
  await prisma.organizacion.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } });
  await prisma.empresa.deleteMany({ where: { id: { in: [ids.companyA, ids.companyB, ids.sharedCompany] } } });
}

async function main() {
  await cleanup();
  try {
    await prisma.organizacion.createMany({ data: [
      { id: ids.orgA, nombre: 'Consultora A', tipo: TipoOrganizacion.CONSULTORA },
      { id: ids.orgB, nombre: 'Consultora B', tipo: TipoOrganizacion.CONSULTORA },
    ] });
    await prisma.empresa.createMany({ data: [
      { id: ids.companyA, nombre: 'Cliente A' },
      { id: ids.companyB, nombre: 'Cliente B' },
      { id: ids.sharedCompany, nombre: 'Cliente compartido' },
    ] });
    await prisma.organizacionEmpresa.createMany({ data: [
      { id: ids.relationAA, organizacionId: ids.orgA, empresaId: ids.companyA, estado: EstadoRelacionEmpresa.ACTIVA },
      { id: ids.relationAB, organizacionId: ids.orgA, empresaId: ids.companyB, estado: EstadoRelacionEmpresa.ACTIVA },
      { id: ids.relationAShared, organizacionId: ids.orgA, empresaId: ids.sharedCompany, estado: EstadoRelacionEmpresa.ACTIVA },
      { id: ids.relationBShared, organizacionId: ids.orgB, empresaId: ids.sharedCompany, estado: EstadoRelacionEmpresa.ACTIVA },
    ] });
    await prisma.establecimiento.createMany({ data: [
      { id: ids.establishmentA, empresaId: ids.companyA, nombre: 'Planta A' },
      { id: ids.establishmentB, empresaId: ids.companyB, nombre: 'Planta B' },
      { id: ids.establishmentShared, empresaId: ids.sharedCompany, nombre: 'Planta compartida' },
    ] });
    await prisma.usuario.createMany({ data: [
      { id: ids.adminA, email: 'checklists-admin-a@seh.test', password: 'hash', nombre: 'Admin', apellido: 'A', rol: Rol.ADMIN_EMPRESA, empresaId: ids.companyA },
      { id: ids.techA, email: 'checklists-tech-a@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'A', rol: Rol.TECNICO, empresaId: ids.companyA },
      { id: ids.techB, email: 'checklists-tech-b@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'B', rol: Rol.TECNICO, empresaId: ids.sharedCompany },
    ] });
    await prisma.organizacionMiembro.createMany({ data: [
      { id: ids.memberAdminA, organizacionId: ids.orgA, usuarioId: ids.adminA, rol: RolOrganizacion.OWNER },
      { id: ids.memberTechA, organizacionId: ids.orgA, usuarioId: ids.techA, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
      { id: ids.memberTechB, organizacionId: ids.orgB, usuarioId: ids.techB, rol: RolOrganizacion.AUDITOR_ORGANIZACION },
    ] });
    await prisma.accesoEmpresa.createMany({ data: [
      { id: ids.accessAA, organizacionEmpresaId: ids.relationAA, organizacionMiembroId: ids.memberTechA, organizacionId: ids.orgA, empresaId: ids.companyA, rol: Rol.TECNICO },
      { id: ids.accessAB, organizacionEmpresaId: ids.relationAB, organizacionMiembroId: ids.memberTechA, organizacionId: ids.orgA, empresaId: ids.companyB, rol: Rol.TECNICO },
      { id: ids.accessAShared, organizacionEmpresaId: ids.relationAShared, organizacionMiembroId: ids.memberTechA, organizacionId: ids.orgA, empresaId: ids.sharedCompany, rol: Rol.TECNICO },
      { id: ids.accessBShared, organizacionEmpresaId: ids.relationBShared, organizacionMiembroId: ids.memberTechB, organizacionId: ids.orgB, empresaId: ids.sharedCompany, rol: Rol.TECNICO },
      { id: ids.accessSupervisorAA, organizacionEmpresaId: ids.relationAA, organizacionMiembroId: ids.memberAdminA, organizacionId: ids.orgA, empresaId: ids.companyA, rol: Rol.SUPERVISOR },
      { id: ids.accessSupervisorAB, organizacionEmpresaId: ids.relationAB, organizacionMiembroId: ids.memberAdminA, organizacionId: ids.orgA, empresaId: ids.companyB, rol: Rol.SUPERVISOR },
    ] });
    await prisma.accesoEstablecimiento.createMany({ data: [
      { accesoEmpresaId: ids.accessAA, establecimientoId: ids.establishmentA, empresaId: ids.companyA },
      { accesoEmpresaId: ids.accessAB, establecimientoId: ids.establishmentB, empresaId: ids.companyB },
      { accesoEmpresaId: ids.accessAShared, establecimientoId: ids.establishmentShared, empresaId: ids.sharedCompany },
      { accesoEmpresaId: ids.accessBShared, establecimientoId: ids.establishmentShared, empresaId: ids.sharedCompany },
    ] });
    await prisma.checklist.create({ data: { id: ids.checklistA, nombre: 'Biblioteca A', tipo: TipoChecklist.GENERAL, organizacionId: ids.orgA, items: { create: { id: ids.itemA, descripcion: 'Item histórico', orden: 1 } } } });
    await prisma.checklist.create({ data: { id: ids.checklistB, nombre: 'Biblioteca B', tipo: TipoChecklist.GENERAL, organizacionId: ids.orgB, items: { create: { id: ids.itemB, descripcion: 'Item privado B', orden: 1 } } } });

    assert.equal((await checklists.findAll(ids.orgA)).length, 1, 'A debe ver su biblioteca en cualquiera de sus empresas');
    const contextA = await tenancy.resolveForUser(ids.techA, ids.companyA, ids.relationAA);
    const contextB = await tenancy.resolveForUser(ids.techA, ids.companyB, ids.relationAB);
    assert.equal(contextA.organizacionId, ids.orgA);
    assert.equal(contextB.organizacionId, ids.orgA);
    assert.equal((await checklists.findAll(contextA.organizacionId)).map((item) => item.id).join(','), (await checklists.findAll(contextB.organizacionId)).map((item) => item.id).join(','));
    await assert.rejects(checklists.findOne(ids.checklistB, ids.orgA), /Checklist no encontrado/);

    const inspectionA = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establishmentA, sector: 'A' }, ids.techA, ids.companyA, ids.relationAA, Rol.TECNICO, ids.accessAA, ids.orgA);
    const inspectionB = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establishmentB, sector: 'B' }, ids.techA, ids.companyB, ids.relationAB, Rol.TECNICO, ids.accessAB, ids.orgA);
    assert.equal(inspectionA.checklistId, ids.checklistA);
    assert.equal(inspectionB.checklistId, ids.checklistA);
    const supervisorInspectionA = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establishmentA, sector: 'Supervisor A' }, ids.adminA, ids.companyA, ids.relationAA, Rol.SUPERVISOR, ids.accessSupervisorAA, ids.orgA);
    const supervisorInspectionB = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establishmentB, sector: 'Supervisor B' }, ids.adminA, ids.companyB, ids.relationAB, Rol.SUPERVISOR, ids.accessSupervisorAB, ids.orgA);
    assert.equal(supervisorInspectionA.checklistId, ids.checklistA, 'un supervisor debe usar la biblioteca de su consultora en A');
    assert.equal(supervisorInspectionB.checklistId, ids.checklistA, 'un supervisor debe usar la biblioteca de su consultora en B');
    await assert.rejects(inspections.create({ checklistId: ids.checklistB, establecimientoId: ids.establishmentA, sector: 'cruzado' }, ids.techA, ids.companyA, ids.relationAA, Rol.TECNICO, ids.accessAA, ids.orgA), /No tiene acceso/);

    const sharedA = await inspections.create({ checklistId: ids.checklistA, establecimientoId: ids.establishmentShared, sector: 'compartido A' }, ids.techA, ids.sharedCompany, ids.relationAShared, Rol.TECNICO, ids.accessAShared, ids.orgA);
    const sharedB = await inspections.create({ checklistId: ids.checklistB, establecimientoId: ids.establishmentShared, sector: 'compartido B' }, ids.techB, ids.sharedCompany, ids.relationBShared, Rol.TECNICO, ids.accessBShared, ids.orgB);
    assert.notEqual(sharedA.id, sharedB.id, 'la empresa compartida conserva inspecciones separadas por consultora');

    await prisma.inspeccion.update({ where: { id: sharedA.id }, data: { estado: EstadoInspeccion.COMPLETADA } });
    await checklists.update(ids.checklistA, { nombre: 'Biblioteca A actualizada' }, ids.orgA, ids.adminA);
    await assert.rejects(checklists.updateItem(ids.itemA, { descripcion: 'No cambiar histórico' }, ids.orgA, ids.adminA), /ya fue usado/);
    const historical = await prisma.inspeccion.findUniqueOrThrow({ where: { id: sharedA.id }, include: { items: true } });
    assert.equal(historical.items[0].cumplimiento, 'PENDIENTE');
    assert.equal((await prisma.checklistItem.findUniqueOrThrow({ where: { id: ids.itemA } })).descripcion, 'Item histórico');
    console.log('Checklist library PostgreSQL integration passed: shared consultancy library, company and consultant isolation, authorized use, and historical response protection');
  } finally {
    await cleanup();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
