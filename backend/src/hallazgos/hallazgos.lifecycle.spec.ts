import { BadRequestException } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';

const baseFinding = (actions: Array<Record<string, unknown>> = []) => ({
  id: 'finding-1',
  estado: 'PENDIENTE',
  fotosUrls: null,
  inspeccion: {
    id: 'inspection-1',
    empresaId: 'company-1',
    organizacionEmpresaId: 'context-1',
    estado: 'COMPLETADA',
    establecimientoId: 'est-1',
    asignadoA: { id: 'tech-1' },
    usuario: { id: 'tech-1' },
    accionesCorrectivas: actions,
  },
  accionesCorrectivas: actions,
});

describe('HallazgosService lifecycle', () => {
  it('records an immediate correction without deleting the finding', async () => {
    const finding = baseFinding();
    const prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(finding),
        update: jest.fn().mockResolvedValue({ ...finding, estado: 'SOLUCIONADO' }),
      },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'tech-1' }) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new HallazgosService(prisma as never);

    await service.resolver('finding-1', {
      descripcionSolucion: 'Se colocó la señalización y se verificó el área.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      responsableId: 'tech-1',
      evidenciaUrls: ['/api/hallazgos/finding-1/fotos/evidence.webp'],
    }, 'company-1', 'context-1', 'tech-1', 'TECNICO' as never);

    expect(prisma.hallazgo.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'finding-1' },
      data: expect.objectContaining({ estado: 'SOLUCIONADO', descripcionSolucion: expect.any(String) }),
    }));
    expect(prisma.hallazgoHistorial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipo: 'CORRECCION_INMEDIATA', estadoNuevo: 'SOLUCIONADO' }),
    }));
  });

  it('does not verify a finding while its action is only pending', async () => {
    const finding = baseFinding([{ id: 'action-1', estado: 'PENDIENTE' }]);
    const prisma = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), update: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn() },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.verificarResolucion('finding-1', {
      descripcionSolucion: 'La acción fue revisada en el establecimiento.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.update).not.toHaveBeenCalled();
  });

  it('verifies a completed action explicitly and keeps the resolution in history', async () => {
    const finding = baseFinding([{ id: 'action-1', estado: 'RESUELTA' }]);
    const prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(finding),
        update: jest.fn().mockResolvedValue({ ...finding, estado: 'SOLUCIONADO' }),
      },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'admin-1' }) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    const service = new HallazgosService(prisma as never);

    await service.verificarResolucion('finding-1', {
      descripcionSolucion: 'La acción ejecutada fue verificada en sitio.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      accionCorrectivaId: 'action-1',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never);

    expect(prisma.hallazgoHistorial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipo: 'VERIFICACION', accionCorrectivaId: 'action-1' }),
    }));
  });
});
