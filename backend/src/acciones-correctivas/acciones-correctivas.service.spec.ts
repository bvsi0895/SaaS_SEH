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
        update: jest.fn(),
      },
    };
    const service = new AccionesCorrectivasService(prisma as never);

    await expect(service.findOne('action-1', 'company-1', 'context-1', 'technician-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.iniciar('action-1', 'company-1', 'context-1', 'technician-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.accionCorrectiva.update).not.toHaveBeenCalled();
  });

  it('allows the assigned technician to initiate and close the action', async () => {
    const prisma = {
      accionCorrectiva: {
        findUnique: jest.fn().mockResolvedValue(action),
        update: jest.fn().mockResolvedValue(action),
      },
    };
    const service = new AccionesCorrectivasService(prisma as never);

    await service.iniciar('action-1', 'company-1', 'context-1', 'technician-a');
    expect(prisma.accionCorrectiva.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'action-1' },
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
});
