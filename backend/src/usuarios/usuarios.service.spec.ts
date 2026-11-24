import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsuariosService.changePassword', () => {
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: UsuariosService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) => callback(prisma));
    service = new UsuariosService(prisma as never);
  });

  it('verifies, hashes, invalidates the refresh token and returns no credentials', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'user-1', password: 'stored-hash' });
    prisma.usuario.update.mockResolvedValue({ id: 'user-1' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const response = await service.changePassword('user-1', {
      currentPassword: 'Current123!',
      newPassword: 'NewPassword123!',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('Current123!', 'stored-hash');
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hash', tokenVersion: { increment: 1 }, refreshToken: null },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ message: 'Contraseña actualizada exitosamente' });
    expect(JSON.stringify(response)).not.toContain('Password');
  });

  it('rejects an incorrect current password without updating the account', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'user-1', password: 'stored-hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'Wrong123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('rejects a missing authenticated user', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword('missing-user', {
        currentPassword: 'Current123!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});

describe('UsuariosService.create', () => {
  it('uses the authenticated company and creates organization membership and access', async () => {
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      empresa: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-authenticated' }),
      },
      organizacionEmpresa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-company-1',
          organizacionId: 'org-1',
          empresaId: 'company-authenticated',
          estado: 'ACTIVA',
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback({
        usuario: {
          create: jest.fn().mockResolvedValue({ id: 'user-created', empresaId: 'company-authenticated' }),
        },
        organizacionMiembro: {
          create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        },
        accesoEmpresa: {
          create: jest.fn().mockResolvedValue({ id: 'access-1' }),
        },
      })),
    };
    const service = new UsuariosService(prisma as never);

    await service.create({
      email: 'tecnico@demo.local',
      password: 'simplepass',
      nombre: 'Ana',
      apellido: 'Técnica',
      rol: 'TECNICO',
    }, 'company-authenticated', 'org-1', 'org-company-1');

    expect(prisma.empresa.findUnique).toHaveBeenCalledWith({ where: { id: 'company-authenticated' } });
    expect(prisma.organizacionEmpresa.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-company-1' },
      select: { id: true, organizacionId: true, empresaId: true, estado: true },
    });
  });

  it('rejects an organization-company relation from another tenant', async () => {
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(null) },
      empresa: { findUnique: jest.fn().mockResolvedValue({ id: 'company-authenticated' }) },
      organizacionEmpresa: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org-company-other', organizacionId: 'org-other', empresaId: 'company-other', estado: 'ACTIVA',
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new UsuariosService(prisma as never);

    await expect(service.create({
      email: 'tecnico@demo.local', password: 'simplepass', nombre: 'Ana', apellido: 'Técnica', rol: 'TECNICO',
    }, 'company-authenticated', 'org-1', 'org-company-other')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('makes a created technician visible only to its tenant user and selector queries', async () => {
    const users = new Map<string, { id: string; email: string; rol: string; empresaId: string }>();
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string } }) =>
          where.email ? users.get(where.email) ?? null : null),
        findMany: jest.fn().mockImplementation(({ where }: { where: { empresaId: string; rol?: string } }) =>
          [...users.values()].filter((user) => user.empresaId === where.empresaId && (!where.rol || user.rol === where.rol))),
      },
      empresa: { findUnique: jest.fn().mockResolvedValue({ id: 'company-a' }) },
      organizacionEmpresa: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org-company-a', organizacionId: 'org-a', empresaId: 'company-a', estado: 'ACTIVA' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback({
        usuario: {
          create: jest.fn().mockImplementation(async ({ data }: { data: { email: string; rol: string; empresaId: string } }) => {
            const created = { id: 'technician-a', email: data.email, rol: data.rol, empresaId: data.empresaId };
            users.set(created.email, created);
            return created;
          }),
        },
        organizacionMiembro: { create: jest.fn().mockResolvedValue({ id: 'membership-a' }) },
        accesoEmpresa: { create: jest.fn().mockResolvedValue({ id: 'access-a' }) },
      })),
    };
    const service = new UsuariosService(prisma as never);

    await service.create({
      email: 'tecnico-a@demo.local', password: 'simplepass', nombre: 'Ana', apellido: 'Técnica', rol: 'TECNICO',
    }, 'company-a', 'org-a', 'org-company-a');

    expect(await service.findAll('company-a', undefined, 'org-a')).toHaveLength(1);
    expect(await service.findAll('company-a', { rol: 'TECNICO' as never }, 'org-a')).toHaveLength(1);
    expect(await service.findAll('company-b', { rol: 'TECNICO' as never }, 'org-b')).toHaveLength(0);
  });
});
