import { ConflictException, ForbiddenException } from '@nestjs/common';
import { EstadoSuscripcionSaaS, EventoSuscripcionSaaS } from '@prisma/client';
import { SaasCommercialService } from './saas-commercial.service';

const activePlan = { id: 'plan-1', codigo: 'PROFESIONAL', nombre: 'Profesional', maxUsuarios: 2, maxEmpresas: 1, activo: true };

describe('SaasCommercialService', () => {
  const config = { get: jest.fn().mockReturnValue(undefined) };

  it('blocks suspended and expired subscriptions but allows active subscriptions', async () => {
    const prisma = { suscripcionSaaS: { findUnique: jest.fn() } };
    const service = new SaasCommercialService(prisma as never, config as never);

    prisma.suscripcionSaaS.findUnique.mockResolvedValue({ estado: EstadoSuscripcionSaaS.SUSPENDIDA, plan: activePlan });
    await expect(service.assertOperationalAccess('org-a')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.suscripcionSaaS.findUnique.mockResolvedValue({
      estado: EstadoSuscripcionSaaS.TRIAL,
      pruebaFinalizaEn: new Date(Date.now() - 60_000),
      finPeriodo: null,
      plan: activePlan,
    });
    await expect(service.assertOperationalAccess('org-a')).rejects.toBeInstanceOf(ForbiddenException);

    prisma.suscripcionSaaS.findUnique.mockResolvedValue({
      id: 'sub-1', organizacionId: 'org-a', estado: EstadoSuscripcionSaaS.ACTIVA,
      inicio: new Date(), finPeriodo: null, pruebaFinalizaEn: null, motivo: null, plan: activePlan,
    });
    await expect(service.assertOperationalAccess('org-a')).resolves.toEqual(expect.objectContaining({ estadoEfectivo: EstadoSuscripcionSaaS.ACTIVA }));
  });

  it('uses a transaction-scoped advisory lock before enforcing concurrent limits', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      suscripcionSaaS: { findUnique: jest.fn().mockResolvedValue({ estado: EstadoSuscripcionSaaS.ACTIVA, plan: activePlan }) },
      organizacionMiembro: { count: jest.fn().mockResolvedValue(2) },
      organizacionEmpresa: { count: jest.fn() },
    };
    const service = new SaasCommercialService({} as never, config as never);

    await expect(service.assertCapacityInTransaction(tx as never, 'org-a', 'usuarios')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.organizacionMiembro.count).toHaveBeenCalledWith({ where: { organizacionId: 'org-a', activa: true } });
  });

  it('records commercial transitions through the audit relation', async () => {
    const tx = {
      suscripcionSaaS: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1', organizacionId: 'org-a', estado: EstadoSuscripcionSaaS.SUSPENDIDA, planId: activePlan.id }),
        update: jest.fn().mockResolvedValue({ id: 'sub-1', organizacionId: 'org-a', estado: EstadoSuscripcionSaaS.ACTIVA, planId: activePlan.id, inicio: new Date(), finPeriodo: null, pruebaFinalizaEn: null, motivo: null, plan: activePlan }),
      },
      planSaaS: { findFirst: jest.fn().mockResolvedValue(activePlan) },
      auditoriaSuscripcionSaaS: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)) };
    const service = new SaasCommercialService(prisma as never, config as never);

    await service.activate('org-a', 'admin-1');
    expect(tx.auditoriaSuscripcionSaaS.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ evento: EventoSuscripcionSaaS.ACTIVADA, estadoNuevo: EstadoSuscripcionSaaS.ACTIVA, actorUsuarioId: 'admin-1' }),
    }));
  });
});

