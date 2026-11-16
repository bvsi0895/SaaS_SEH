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
  };
  let service: UsuariosService;

  beforeEach(() => {
    jest.clearAllMocks();
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
      data: { password: 'new-hash', refreshToken: null },
    });
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
});
