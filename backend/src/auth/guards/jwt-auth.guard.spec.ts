import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard tenant context', () => {
  it('attaches the resolved access ID to every protected request', async () => {
    const tenancy = { resolveForUser: jest.fn().mockResolvedValue({ accesoEmpresaId: 'access-1', empresaId: 'company-1' }) };
    const request = { headers: {}, user: { id: 'user-1', empresaId: 'company-1' } };
    const guard = new JwtAuthGuard(new Reflector(), tenancy as never);

    await (guard as never as { attachTenantContext: (request: { user: { id: string; empresaId: string } }, context?: string) => Promise<void> }).attachTenantContext(request);
    expect(request.user).toEqual(expect.objectContaining({ accesoEmpresaId: 'access-1' }));
  });

  it('rejects a protected request when context resolution does not provide an access ID', async () => {
    const tenancy = { resolveForUser: jest.fn().mockResolvedValue({ empresaId: 'company-1' }) };
    const request = { headers: {}, user: { id: 'user-1', empresaId: 'company-1' } };
    const guard = new JwtAuthGuard(new Reflector(), tenancy as never);

    await expect((guard as never as { attachTenantContext: (request: { user: { id: string; empresaId: string } }, context?: string) => Promise<void> }).attachTenantContext(request)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
