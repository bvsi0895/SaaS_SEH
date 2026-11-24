import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard contextual role', () => {
  it('authorizes using the active AccesoEmpresa role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Rol.ADMIN_EMPRESA]) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: { rol: Rol.ADMIN_EMPRESA } }) }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('does not fall back to the legacy Usuario role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Rol.ADMIN_EMPRESA]) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    // The global user record can still say ADMIN_EMPRESA while the selected
    // company access is only a technician access.
    const context = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: { rol: Rol.TECNICO } }) }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
