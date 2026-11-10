import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwtService = { signAsync: jest.fn() };
  const configService = { get: jest.fn() };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    const tenancy = { resolveForUser: jest.fn().mockResolvedValue({ organizacionEmpresaId: 'context-1' }) };
    service = new AuthService(prisma as never, jwtService as never, configService as never, tenancy as never);
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRATION: '1h',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return values[key];
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
  });

  it('mantiene deshabilitado el registro público sin empresa configurada', async () => {
    configService.get.mockReturnValue(undefined);

    await expect(
      service.register({
        email: 'nuevo@demo.local',
        password: 'Password123!',
        nombre: 'Nuevo',
        apellido: 'Usuario',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza credenciales inválidas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'noexiste@demo.local', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('emite tokens y actualiza el acceso cuando las credenciales son válidas', async () => {
    const usuario = {
      id: 'user-1',
      email: 'tecnico@demo.local',
      password: 'hashed-password',
      nombre: 'Técnico',
      apellido: 'Demo',
      rol: 'TECNICO',
      activo: true,
      empresaId: 'empresa-1',
      empresa: { id: 'empresa-1', nombre: 'Demo', activa: true },
    };
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    prisma.usuario.update.mockResolvedValue(usuario);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await service.login({ email: usuario.email, password: 'Password123!' });

    expect(response).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      usuario: { id: 'user-1', empresaId: 'empresa-1', rol: 'TECNICO' },
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
  });
});
