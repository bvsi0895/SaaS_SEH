import { SetMetadata } from '@nestjs/common';
import { Rol } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar qué roles pueden acceder a un endpoint
 * Uso: @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
