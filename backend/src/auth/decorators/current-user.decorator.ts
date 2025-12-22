import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '@prisma/client';

/**
 * Decorador para obtener el usuario actual desde el request
 * Uso: @CurrentUser() user: Usuario
 * Uso parcial: @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof Usuario | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as Usuario;

    if (!user) {
      return null;
    }

    // Si se especifica una propiedad, retornar solo esa
    return data ? user[data] : user;
  },
);
