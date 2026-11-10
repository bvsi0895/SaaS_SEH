import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenancyService } from './tenancy.service';

describe('TenancyService', () => {
  const prisma = {
    accesoEmpresa: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  let service: TenancyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenancyService(prisma as never);
  });

  it('resuelve el vínculo autorizado y no acepta el vínculo de otra consultora', async () => {
    prisma.accesoEmpresa.findFirst.mockImplementation(({ where }: any) => {
      const requested = where.organizacionEmpresa?.id;
      if (requested === 'vinculo-consultora-a') {
        return Promise.resolve({
          id: 'acceso-a',
          organizacionId: 'org-a',
          empresaId: 'empresa-compartida',
          organizacionEmpresaId: 'vinculo-consultora-a',
          organizacionMiembroId: 'miembro-a',
        });
      }
      return Promise.resolve(null);
    });

    const context = await service.resolveForUser(
      'usuario-a',
      'empresa-compartida',
      'vinculo-consultora-a',
    );

    expect(context.organizacionId).toBe('org-a');
    await expect(
      service.resolveForUser('usuario-a', 'empresa-compartida', 'vinculo-consultora-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('mantiene contextos independientes aunque compartan empresa', async () => {
    prisma.accesoEmpresa.findMany.mockResolvedValue([
      {
        id: 'acceso-a',
        organizacionId: 'org-a',
        empresaId: 'empresa-compartida',
        organizacionEmpresaId: 'vinculo-consultora-a',
        organizacionMiembroId: 'miembro-a',
      },
      {
        id: 'acceso-b',
        organizacionId: 'org-b',
        empresaId: 'empresa-compartida',
        organizacionEmpresaId: 'vinculo-consultora-b',
        organizacionMiembroId: 'miembro-b',
      },
    ]);

    const contexts = await service.listForUser('usuario-multi-org');

    expect(contexts.map((context) => context.organizacionEmpresaId)).toEqual([
      'vinculo-consultora-a',
      'vinculo-consultora-b',
    ]);
    expect(new Set(contexts.map((context) => context.organizacionId)).size).toBe(2);
  });

  it('rechaza un recurso sin el mismo ámbito del contexto', () => {
    expect(() => service.assertResource('vinculo-consultora-b', {
      organizacionId: 'org-a',
      organizacionEmpresaId: 'vinculo-consultora-a',
      empresaId: 'empresa-compartida',
      organizacionMiembroId: 'miembro-a',
      accesoEmpresaId: 'acceso-a',
    })).toThrow(NotFoundException);
  });
});
