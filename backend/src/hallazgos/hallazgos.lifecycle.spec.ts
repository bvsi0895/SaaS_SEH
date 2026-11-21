import { BadRequestException, ConflictException } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';

const baseFinding = (actions: Array<Record<string, unknown>> = []) => ({
  id: 'finding-1',
  estado: 'PENDIENTE',
  fotosUrls: JSON.stringify(['/api/hallazgos/finding-1/fotos/evidence.webp']),
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
  it('creates a finding and its creation history in one transaction', async () => {
    const created = { id: 'finding-1', estado: 'PENDIENTE', inspeccion: { id: 'inspection-1', sector: 'Producción' } };
    const tx = {
      hallazgo: { create: jest.fn().mockResolvedValue(created) },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      inspeccion: { findUnique: jest.fn().mockResolvedValue({ id: 'inspection-1', empresaId: 'company-1', organizacionEmpresaId: 'context-1', estado: 'EN_PROGRESO', asignadoAId: 'tech-1' }) },
      hallazgo: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const service = new HallazgosService(prisma as never);

    await service.create({
      inspeccionId: 'inspection-1',
      titulo: 'Protección ausente',
      descripcion: 'La protección física del equipo no está instalada.',
      nivelRiesgo: 'ALTO',
      ubicacionTexto: 'Producción',
    }, 'company-1', 'context-1', 'tech-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.hallazgo.create).toHaveBeenCalledTimes(1);
    expect(tx.hallazgoHistorial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ hallazgoId: 'finding-1', tipo: 'CREACION' }),
    }));
  });

  it('records an immediate correction without deleting the finding', async () => {
    const finding = baseFinding();
    const prisma: any = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(finding),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'tech-1' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prisma));
    const service = new HallazgosService(prisma as never);

    await service.resolver('finding-1', {
      descripcionSolucion: 'Se colocó la señalización y se verificó el área.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      responsableId: 'tech-1',
      evidenciaUrls: ['/api/hallazgos/finding-1/fotos/evidence.webp'],
    }, 'company-1', 'context-1', 'tech-1', 'TECNICO' as never);

    expect(prisma.hallazgo.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'finding-1', estado: 'PENDIENTE' },
      data: expect.objectContaining({ estado: 'SOLUCIONADO', descripcionSolucion: expect.any(String) }),
    }));
    expect(prisma.hallazgoHistorial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipo: 'CORRECCION_INMEDIATA', estadoNuevo: 'SOLUCIONADO' }),
    }));
  });

  it('persists an external resolution responsible and keeps the registering user as auditor', async () => {
    const finding = baseFinding();
    const prisma: any = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(finding),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
      usuario: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prisma));
    const service = new HallazgosService(prisma as never);

    await service.resolver('finding-1', {
      descripcionSolucion: 'Se corrigió la condición insegura con un proveedor externo.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      responsableTexto: 'María Proveedora',
      responsableCargo: 'Contratista eléctrica',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never);

    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
    expect(prisma.hallazgo.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        responsableResolucionId: undefined,
        responsableResolucionTexto: 'María Proveedora',
        responsableResolucionCargo: 'Contratista eléctrica',
      }),
    }));
    expect(prisma.hallazgoHistorial.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        usuarioId: 'admin-1',
        responsableId: undefined,
        responsableTexto: 'María Proveedora',
        responsableCargo: 'Contratista eléctrica',
      }),
    }));
  });

  it('rejects an internal responsible outside the active company context', async () => {
    const finding = baseFinding();
    const prisma: any = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.resolver('finding-1', {
      descripcionSolucion: 'Se verificó el trabajo realizado en el establecimiento.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      responsableId: 'user-from-another-tenant',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.updateMany).not.toHaveBeenCalled();
  });

  it('does not verify a finding while its action is only pending', async () => {
    const finding = baseFinding([{ id: 'action-1', estado: 'PENDIENTE' }]);
    const prisma = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn() },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.verificarResolucion('finding-1', {
      descripcionSolucion: 'La acción fue revisada en el establecimiento.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.updateMany).not.toHaveBeenCalled();
  });

  it('does not allow immediate correction when a corrective action exists', async () => {
    const finding = baseFinding([{ id: 'action-1', estado: 'PENDIENTE' }]);
    const prisma: any = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn() },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.resolver('finding-1', {
      descripcionSolucion: 'Se corrigió el hallazgo sin respetar la verificación.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.updateMany).not.toHaveBeenCalled();
  });

  it('rejects verification when one of multiple actions is still pending', async () => {
    const finding = baseFinding([
      { id: 'action-1', estado: 'RESUELTA' },
      { id: 'action-2', estado: 'PENDIENTE' },
    ]);
    const prisma = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn() },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.verificarResolucion('finding-1', {
      descripcionSolucion: 'Se verificó solamente una de las acciones asociadas.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      accionCorrectivaId: 'action-1',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.updateMany).not.toHaveBeenCalled();
  });

  it('rejects evidence that is not already authorized for the finding', async () => {
    const finding = baseFinding();
    const prisma = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn() },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'admin-1' }) },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.resolver('finding-1', {
      descripcionSolucion: 'Se corrigió la condición insegura y se verificó el área.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
      evidenciaUrls: ['/api/hallazgos/other-finding/fotos/evidence.webp'],
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a stale resolution when the conditional state update loses a race', async () => {
    const finding = baseFinding();
    const prisma: any = {
      hallazgo: { findUnique: jest.fn().mockResolvedValue(finding), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      hallazgoHistorial: { create: jest.fn() },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'admin-1' }) },
      $transaction: jest.fn(async (callback: (client: any) => Promise<unknown>) => callback(prisma)),
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.resolver('finding-1', {
      descripcionSolucion: 'Se corrigió la condición insegura y se verificó el área.',
      fechaResolucion: '2026-11-20T15:00:00.000Z',
    }, 'company-1', 'context-1', 'admin-1', 'ADMIN_EMPRESA' as never)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.hallazgoHistorial.create).not.toHaveBeenCalled();
  });

  it('verifies a completed action explicitly and keeps the resolution in history', async () => {
    const finding = baseFinding([{ id: 'action-1', estado: 'RESUELTA' }]);
    const prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(finding),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      hallazgoHistorial: { create: jest.fn().mockResolvedValue({}) },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'admin-1' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
      ...prisma,
      accionCorrectiva: { findMany: jest.fn().mockResolvedValue([{ id: 'action-1', estado: 'RESUELTA' }]) },
    }));
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
