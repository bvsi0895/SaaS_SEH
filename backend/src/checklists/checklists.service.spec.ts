import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RolOrganizacion } from '@prisma/client';
import { ChecklistsService } from './checklists.service';

describe('ChecklistsService biblioteca por consultora', () => {
  const prisma = {
    organizacionMiembro: { findFirst: jest.fn() },
    checklist: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    checklistItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: ChecklistsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChecklistsService(prisma as never);
  });

  it('returns the same library for two companies in one consultora', async () => {
    const library = [{ id: '00000000-0000-4000-8000-000000000101', organizacionId: 'org-a' }];
    prisma.checklist.findMany.mockResolvedValue(library);

    await expect(service.findAll('org-a')).resolves.toBe(library);
    await expect(service.findAll('org-a')).resolves.toBe(library);

    expect(prisma.checklist.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizacionId: 'org-a' } }));
  });

  it('does not expose a checklist owned by another consultora', async () => {
    prisma.checklist.findFirst.mockResolvedValue(null);

    await expect(service.findOne('00000000-0000-4000-8000-000000000101', 'org-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.checklist.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '00000000-0000-4000-8000-000000000101', organizacionId: 'org-b' },
    }));
  });

  it('uses the authenticated consultora and only permits its library administrators to mutate', async () => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue({ rol: RolOrganizacion.ADMIN_ORGANIZACION });
    prisma.checklist.create.mockResolvedValue({ id: 'new-checklist', organizacionId: 'org-a' });

    await service.create('org-a', 'user-a', { nombre: 'Biblioteca A', tipo: 'GENERAL', items: [] } as never);

    expect(prisma.checklist.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizacionId: 'org-a' }),
    }));
    expect(prisma.organizacionMiembro.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizacionId: 'org-a', usuarioId: 'user-a' }),
    }));

    prisma.organizacionMiembro.findFirst.mockResolvedValue({ rol: RolOrganizacion.AUDITOR_ORGANIZACION });
    await expect(service.create('org-a', 'user-a', { nombre: 'No autorizado', tipo: 'GENERAL' } as never))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents changing an item already referenced by an inspection', async () => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue({ rol: RolOrganizacion.OWNER });
    prisma.checklistItem.findFirst.mockResolvedValue({ id: 'item-a', inspeccionItems: [{ id: 'answer-a' }] });

    await expect(service.updateItem('item-a', { descripcion: 'Cambio' }, 'org-a', 'user-a'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.checklistItem.update).not.toHaveBeenCalled();
  });
});
