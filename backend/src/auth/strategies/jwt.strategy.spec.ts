import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('JwtStrategy tokenVersion', () => {
  const configService = { get: jest.fn().mockReturnValue('test-secret') };
  const prisma = { usuario: { findUnique: jest.fn() } };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(configService as never, prisma as never);
  });

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'user@example.com',
    empresaId: 'company-1',
    rol: 'TECNICO',
    tokenVersion: 3,
    tokenType: 'access',
    jti: 'access-jti',
  };

  it('accepts a token whose version matches the current user', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      tokenVersion: 3,
      activo: true,
      empresa: { id: 'company-1', nombre: 'Empresa', activa: true },
      password: 'hash',
      refreshToken: null,
    });

    await expect(strategy.validate(payload)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('rejects a token from a previous password/session version', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      tokenVersion: 4,
      activo: true,
      empresa: { id: 'company-1', nombre: 'Empresa', activa: true },
      password: 'hash',
      refreshToken: null,
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
