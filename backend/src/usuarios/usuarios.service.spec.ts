import { BadRequestException, NotFoundException } from '@nestjs/common';
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
