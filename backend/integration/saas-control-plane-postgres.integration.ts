import { strict as assert } from 'node:assert';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, EstadoSuscripcionSaaS, Rol, RolOrganizacion, TipoOrganizacion } from '@prisma/client';
import { SaasCommercialService } from '../src/saas/saas-commercial.service';

const prisma = new PrismaClient();
const service = new SaasCommercialService(prisma as never, { get: () => undefined } as never);

const ids = {
  organization: '00000000-0000-4000-8000-000000000901',
  company: '00000000-0000-4000-8000-000000000902',
  relation: '00000000-0000-4000-8000-000000000903',
  actor: '00000000-0000-4000-8000-000000000904',
  users: Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-00000000091${index + 1}`),
  members: Array.from({ length: 5 }, (_, index) => `00000000-0000-4000-8000-00000000092${index + 1}`),
};

async function cleanup() {
  await prisma.auditoriaSuscripcionSaaS.deleteMany({ where: { organizacionId: ids.organization } });
  await prisma.suscripcionSaaS.deleteMany({ where: { organizacionId: ids.organization } });
  await prisma.organizacionMiembro.deleteMany({ where: { organizacionId: ids.organization } });
  await prisma.usuario.deleteMany({ where: { id: { in: [...ids.users, ids.actor] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: ids.relation } });
  await prisma.organizacion.deleteMany({ where: { id: ids.organization } });
  await prisma.empresa.deleteMany({ where: { id: ids.company } });
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.create({ data: { id: ids.company, nombre: 'PR35 company' } });
    await prisma.organizacion.create({ data: { id: ids.organization, nombre: 'PR35 consultora', tipo: TipoOrganizacion.CONSULTORA } });
    await prisma.organizacionEmpresa.create({ data: { id: ids.relation, organizacionId: ids.organization, empresaId: ids.company } });
    await prisma.usuario.create({ data: { id: ids.actor, email: 'pr35-actor@seh.test', password: 'hash', nombre: 'PR35', apellido: 'Actor', rol: Rol.ADMIN_EMPRESA, empresaId: ids.company } });

    const trial = await service.startTrial(ids.organization, ids.actor);
    assert.equal(trial.estado, EstadoSuscripcionSaaS.TRIAL);
    assert.equal(trial.plan.codigo, 'DEMO_15_DIAS');
    assert.ok(trial.pruebaFinalizaEn && trial.pruebaFinalizaEn.getTime() > Date.now());
    await service.assertOperationalAccess(ids.organization);

    await prisma.suscripcionSaaS.update({ where: { organizacionId: ids.organization }, data: { estado: EstadoSuscripcionSaaS.TRIAL, pruebaFinalizaEn: new Date(Date.now() - 1000) } });
    await assert.rejects(service.assertOperationalAccess(ids.organization), (error: unknown) => error instanceof ForbiddenException);

    await service.activate(ids.organization, ids.actor, '00000000-0000-4000-8000-000000000352');
    await service.assertOperationalAccess(ids.organization);
    await service.suspend(ids.organization, ids.actor, 'impago de prueba');
    await assert.rejects(service.assertOperationalAccess(ids.organization), (error: unknown) => error instanceof ForbiddenException);
    await service.activate(ids.organization, ids.actor, '00000000-0000-4000-8000-000000000352');

    await prisma.usuario.createMany({ data: ids.users.map((id, index) => ({ id, email: `pr35-${index}@seh.test`, password: 'hash', nombre: 'PR35', apellido: `${index}`, rol: Rol.TECNICO, empresaId: ids.company })) });
    await prisma.organizacionMiembro.createMany({ data: ids.members.map((id, index) => ({ id, organizacionId: ids.organization, usuarioId: ids.users[index], rol: RolOrganizacion.AUDITOR_ORGANIZACION })) });

    const capacityError = await prisma.$transaction((tx) => service.assertCapacityInTransaction(tx as never, ids.organization, 'usuarios')).then(
      () => null,
      (error: unknown) => error,
    );
    assert.ok(capacityError instanceof ConflictException, `el plan demo debe rechazar el sexto usuario: ${String((capacityError as Error)?.message || capacityError)}`);
    assert.ok((await prisma.auditoriaSuscripcionSaaS.count({ where: { organizacionId: ids.organization } })) >= 4);
    console.log('PR35 SaaS PostgreSQL integration passed: trial, expiry, suspension, reactivation, audit and user limit');
  } finally {
    await cleanup();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

