import { NotFoundException } from '@nestjs/common';
import { CumplimientoItem, EstadoInspeccion } from '@prisma/client';
import { InspeccionesService } from './inspecciones.service';

describe('InspeccionesService respuestas', () => {
  const prisma = {
    checklist: { findUnique: jest.fn() },
    inspeccion: { findUnique: jest.fn(), create: jest.fn() },
    inspeccionItem: { update: jest.fn() },
  };
  let service: InspeccionesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InspeccionesService(prisma as never);
  });

  it('persists a changed answer for the item in the authorized inspection', async () => {
    prisma.inspeccion.findUnique.mockResolvedValue({
      id: 'inspection-1',
      empresaId: 'company-1',
      organizacionEmpresaId: 'context-1',
      estado: EstadoInspeccion.EN_PROGRESO,
      items: [{ id: 'inspection-item-1' }],
    });
    prisma.inspeccionItem.update.mockResolvedValue({ id: 'inspection-item-1' });

    await service.registrarItem(
      'inspection-1',
      { inspeccionItemId: 'inspection-item-1', cumplimiento: CumplimientoItem.NO_CUMPLE },
      'company-1',
      'context-1',
    );

    expect(prisma.inspeccionItem.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'inspection-item-1' },
      data: { cumplimiento: CumplimientoItem.NO_CUMPLE, observacion: undefined },
    }));
  });

  it('rejects answers for an item from another inspection', async () => {
    prisma.inspeccion.findUnique.mockResolvedValue({
      id: 'inspection-1',
      empresaId: 'company-1',
      organizacionEmpresaId: 'context-1',
      estado: EstadoInspeccion.EN_PROGRESO,
      items: [{ id: 'different-item' }],
    });

    await expect(
      service.registrarItem(
        'inspection-1',
        { inspeccionItemId: 'foreign-item', cumplimiento: CumplimientoItem.CUMPLE },
        'company-1',
        'context-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.inspeccionItem.update).not.toHaveBeenCalled();
  });

  it('does not persist an answer from another organization context', async () => {
    prisma.inspeccion.findUnique.mockResolvedValue({
      id: 'inspection-1',
      empresaId: 'company-1',
      organizacionEmpresaId: 'context-1',
      estado: EstadoInspeccion.EN_PROGRESO,
      items: [{ id: 'inspection-item-1' }],
    });

    await expect(
      service.registrarItem(
        'inspection-1',
        { inspeccionItemId: 'inspection-item-1', cumplimiento: CumplimientoItem.NO_CUMPLE },
        'company-1',
        'context-2',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.inspeccionItem.update).not.toHaveBeenCalled();
  });

  it('starts new inspections with unanswered items instead of counting them as compliant', async () => {
    prisma.checklist.findUnique.mockResolvedValue({
      id: 'checklist-1',
      empresaId: 'company-1',
      organizacionEmpresaId: 'context-1',
      activo: true,
      items: [{ id: 'checklist-item-1' }],
    });
    prisma.inspeccion.create.mockResolvedValue({ id: 'inspection-1' });

    await service.create(
      { checklistId: 'checklist-1', sector: 'Producción' },
      'user-1',
      'company-1',
      'context-1',
    );

    expect(prisma.inspeccion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        items: { create: [{ checklistItemId: 'checklist-item-1', cumplimiento: CumplimientoItem.PENDIENTE }] },
      }),
    }));
  });
});
