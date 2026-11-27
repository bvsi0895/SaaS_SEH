import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Autorización del plano de control. No usa Rol, OWNER ni el contexto de una
 * empresa: la concesión se registra explícitamente en administradores_saas.
 */
@Injectable()
export class SaasAdminGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    const request = context.switchToHttp().getRequest<{ user?: { id: string } }>();
    const userId = request.user?.id;
    if (!authenticated || !userId) throw new ForbiddenException('Administrador SaaS no autenticado');

    const administrator = await this.prisma.administradorSaaS.findFirst({
      where: { usuarioId: userId, activo: true, usuario: { activo: true } },
      select: { id: true },
    });
    if (!administrator) throw new ForbiddenException('Se requiere una autorización de administrador SaaS');
    return true;
  }
}

