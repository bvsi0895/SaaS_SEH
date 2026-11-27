import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
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
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configService = { get: jest.fn() };
  let tenancy: { resolveForUser: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenancy = { resolveForUser: jest.fn().mockResolvedValue({ organizacionEmpresaId: 'context-1' }) };
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
      tokenVersion: 4,
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
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: 'user-1', tokenVersion: 4, tokenType: 'access' }),
      expect.objectContaining({ secret: 'test-secret', expiresIn: '1h' }),
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sub: 'user-1', tokenVersion: 4, tokenType: 'refresh' }),
      expect.objectContaining({ secret: 'test-refresh-secret', expiresIn: '30d' }),
    );
  });

  it('verifies and rotates a valid refresh token using its version', async () => {
    const usuario = {
      id: 'user-1',
      email: 'tecnico@demo.local',
      password: 'hashed-password',
      nombre: 'Técnico',
      apellido: 'Demo',
      rol: 'TECNICO',
      tokenVersion: 4,
      empresaId: 'empresa-1',
      refreshToken: createHash('sha256').update('refresh-token', 'utf8').digest('hex'),
    };
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: usuario.email,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      tokenVersion: 4,
      tokenType: 'refresh',
      jti: 'refresh-jti',
      organizacionEmpresaId: 'context-1',
    });

    const response = await service.refreshTokens('refresh-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', { secret: 'test-refresh-secret' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(response).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(tenancy.resolveForUser).toHaveBeenCalledWith('user-1', 'empresa-1', 'context-1');
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshToken: createHash('sha256').update('refresh-token', 'utf8').digest('hex') },
    });
  });

  it('rechaza renovar un token cuyo contexto ya no está autorizado', async () => {
    const usuario = {
      id: 'user-1',
      email: 'tecnico@demo.local',
      rol: 'TECNICO',
      tokenVersion: 4,
      empresaId: 'empresa-1',
      refreshToken: createHash('sha256').update('refresh-token', 'utf8').digest('hex'),
    };
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    jwtService.verifyAsync.mockResolvedValue({
      sub: usuario.id,
      tokenVersion: usuario.tokenVersion,
      tokenType: 'refresh',
      jti: 'refresh-jti',
      organizacionEmpresaId: 'context-revocado',
    });
    tenancy.resolveForUser.mockRejectedValue(new Error('context revoked'));

    await expect(service.refreshTokens('refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('rejects refresh tokens with an invalid signature or version', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));

    await expect(service.refreshTokens('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();

    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', tokenVersion: 3, tokenType: 'refresh' });
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      tokenVersion: 4,
      refreshToken: createHash('sha256').update('current-token', 'utf8').digest('hex'),
    });

    await expect(service.refreshTokens('old-version-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('increments tokenVersion and clears the refresh token atomically on logout', async () => {
    await service.logout('user-1');

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        tokenVersion: { increment: 1 },
        refreshToken: null,
      },
    });
  });
});

