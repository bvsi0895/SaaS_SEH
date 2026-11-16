import assert from 'node:assert/strict';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion, EstadoRelacionEmpresa } from '@prisma/client';
import { UsuariosService } from '../src/usuarios/usuarios.service';

const prisma = new PrismaClient();
const service = new UsuariosService(prisma as never);
const userEmail = 'integration-technician@seh.test';

const ids = {
  empresaA: '00000000-0000-0000-0000-000000000101',
  empresaB: '00000000-0000-0000-0000-000000000102',
  organizacionA: '00000000-0000-0000-0000-000000000201',
  organizacionB: '00000000-0000-0000-0000-000000000202',
  relacionA: '00000000-0000-0000-0000-000000000301',
  relacionOtherOrg: '00000000-0000-0000-0000-000000000302',
  relacionB: '00000000-0000-0000-0000-000000000303',
};

async function cleanup() {
  const user = await prisma.usuario.findUnique({ where: { email: userEmail }, select: { id: true } });
  if (user) {
    const memberships = await prisma.organizacionMiembro.findMany({
      where: { usuarioId: user.id },
      select: { id: true },
    });
    await prisma.accesoEmpresa.deleteMany({
      where: { organizacionMiembroId: { in: memberships.map((membership) => membership.id) } },
    });
    await prisma.organizacionMiembro.deleteMany({ where: { usuarioId: user.id } });
    await prisma.usuario.delete({ where: { id: user.id } });
  }
  await prisma.accesoEmpresa.deleteMany({ where: { organizacionEmpresaId: { in: [ids.relacionA, ids.relacionOtherOrg, ids.relacionB] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: { in: [ids.relacionA, ids.relacionOtherOrg, ids.relacionB] } } });
  await prisma.organizacion.deleteMany({ where: { id: { in: [ids.organizacionA, ids.organizacionB] } } });
  await prisma.empresa.deleteMany({ where: { id: { in: [ids.empresaA, ids.empresaB] } } });
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.createMany({
      data: [
        { id: ids.empresaA, nombre: 'Integration Empresa A' },
        { id: ids.empresaB, nombre: 'Integration Empresa B' },
      ],
    });
    await prisma.organizacion.createMany({
      data: [
        { id: ids.organizacionA, nombre: 'Integration Organización A', tipo: TipoOrganizacion.CONSULTORA },
        { id: ids.organizacionB, nombre: 'Integration Organización B', tipo: TipoOrganizacion.CONSULTORA },
      ],
    });
    await prisma.organizacionEmpresa.createMany({
      data: [
        { id: ids.relacionA, organizacionId: ids.organizacionA, empresaId: ids.empresaA, estado: EstadoRelacionEmpresa.ACTIVA },
        { id: ids.relacionOtherOrg, organizacionId: ids.organizacionB, empresaId: ids.empresaA, estado: EstadoRelacionEmpresa.ACTIVA },
        { id: ids.relacionB, organizacionId: ids.organizacionB, empresaId: ids.empresaB, estado: EstadoRelacionEmpresa.ACTIVA },
      ],
    });

    const created = await service.create({
      email: userEmail,
      password: 'integration-password',
      nombre: 'Técnico',
      apellido: 'Integration',
      rol: Rol.TECNICO,
    }, ids.empresaA, ids.organizacionA, ids.relacionA);

    const user = await prisma.usuario.findUnique({ where: { email: userEmail } });
    assert.equal(created.id, user?.id, 'the service must return the persisted user');
    assert.equal(user?.empresaId, ids.empresaA, 'the technician must belong to the authenticated company');
    assert.equal(user?.rol, Rol.TECNICO);

    const membership = await prisma.organizacionMiembro.findFirst({ where: { usuarioId: user!.id } });
    assert.equal(membership?.organizacionId, ids.organizacionA, 'the membership must use the authenticated organization');
    assert.equal(membership?.rol, RolOrganizacion.AUDITOR_ORGANIZACION);

    const access = await prisma.accesoEmpresa.findFirst({ where: { organizacionMiembroId: membership!.id } });
    assert.equal(access?.organizacionEmpresaId, ids.relacionA);
    assert.equal(access?.empresaId, ids.empresaA);

    const users = await service.findAll(ids.empresaA, undefined, ids.organizacionA);
    assert.equal(users.some((item) => item.id === user!.id), true, 'the technician must appear in Users');

    const eligibleTechnicians = await service.findAll(ids.empresaA, { rol: Rol.TECNICO }, ids.organizacionA);
    assert.equal(eligibleTechnicians.some((item) => item.id === user!.id), true, 'the technician must appear in the responsible selector');

    const otherCompanyUsers = await service.findAll(ids.empresaB, undefined, ids.organizacionB);
    const otherOrganizationUsers = await service.findAll(ids.empresaA, undefined, ids.organizacionB);
    assert.equal(otherCompanyUsers.some((item) => item.id === user!.id), false, 'another company must not see the technician');
    assert.equal(otherOrganizationUsers.some((item) => item.id === user!.id), false, 'another organization must not see the technician');

    console.log('PostgreSQL integration passed: creation, membership, access, users list, responsible selector, tenant isolation');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
