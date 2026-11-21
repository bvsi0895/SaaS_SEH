import { NotFoundException } from '@nestjs/common';
import { EstadoAccion } from '@prisma/client';
import { AccionesCorrectivasService } from './acciones-correctivas.service';

describe('AccionesCorrectivasService technician authorization', () => {
  const action = {
    id: 'action-1',
    empresaId: 'company-1',
    organizacionEmpresaId: 'context-1',
    responsableId: 'technician-a',
    estado: EstadoAccion.PENDIENTE,
    hallazgo: { id: 'finding-1', inspeccion: { id: 'inspection-1' } },
    responsable: { id: 'technician-a', nombre: 'Ana', apellido: 'Técnica', email: 'ana@test.local' },
    creador: { id: 'admin-1', nombre: 'Admin', apellido: 'Demo' },
  };

  it('denies direct access and state changes for another technician', async () => {
    const prisma = {
      accionCorrectiva: {
        findUnique: jest.fn().mockResolvedValue(action),
        updateMany: jest.fn(),
      },
    };
    const service = new AccionesCorrectivasService(prisma as never);

    await expect(service.findOne('action-1', 'company-1', 'context-1', 'technician-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.iniciar('action-1', 'company-1', 'context-1', 'technician-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.accionCorrectiva.updateMany).not.toHaveBeenCalled();
  });

  it('allows the assigned technician to initiate and close the action', async () => {
    const prisma = {
      accionCorrectiva: {
        findUnique: jest.fn().mockResolvedValue(action),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new AccionesCorrectivasService(prisma as never);

    await service.iniciar('action-1', 'company-1', 'context-1', 'technician-a');
    expect(prisma.accionCorrectiva.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'action-1', estado: EstadoAccion.PENDIENTE },
      data: { estado: EstadoAccion.EN_PROGRESO },
    }));
  });

  it('returns responsible identity in the technician action list', async () => {
    const findMany = jest.fn().mockResolvedValue([action]);
    const prisma = { accionCorrectiva: { findMany } };
    const service = new AccionesCorrectivasService(prisma as never);

    await service.findMine('technician-a', 'company-1', undefined, 'context-1');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ responsableId: 'technician-a' }),
      include: expect.objectContaining({
        responsable: { select: { id: true, nombre: true, apellido: true } },
      }),
    }));
  });

  it('creates the action and finding transition through the same transaction client', async () => {
    const created = { id: 'action-2', hallazgoId: 'finding-1', estado: EstadoAccion.PENDIENTE };
    const tx = {
      accionCorrectiva: { create: jest.fn().mockResolvedValue(created) },
    };
    const prisma: any = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'PENDIENTE',
          inspeccion: { empresaId: 'company-1', organizacionEmpresaId: 'context-1' },
        }),
      },
      usuario: { findFirst: jest.fn() },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const hallazgos = { markInCorrectionInTransaction: jest.fn().mockResolvedValue(undefined) };
    const service = new AccionesCorrectivasService(prisma as never, undefined, hallazgos as never);

    await service.create({
      hallazgoId: 'finding-1',
      descripcion: 'Instalar una protección física permanente',
      fechaCompromiso: '2026-12-01',
    }, 'admin-1', 'company-1', 'context-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.accionCorrectiva.create).toHaveBeenCalledTimes(1);
    expect(hallazgos.markInCorrectionInTransaction).toHaveBeenCalledWith(
      tx,
      'finding-1',
      'admin-1',
      'company-1',
      'context-1',
    );
  });
});
