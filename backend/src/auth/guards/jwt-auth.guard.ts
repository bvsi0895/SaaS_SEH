import { Injectable, ExecutionContext, UnauthorizedException, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenancyService } from '../../tenancy/tenancy.service';
import { ALLOW_COMMERCIAL_RECOVERY } from '../../saas/commercial-access.decorator';
import { SaasCommercialService } from '../../saas/saas-commercial.service';

/**
 * Guard de autenticación JWT
 * Verifica que el usuario tenga un token válido
 * Los endpoints marcados con @Public() son excluidos
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private tenancy: TenancyService,
    @Optional() private commercial?: SaasCommercialService,
  ) {
    super();
  }

  private async attachTenantContext(request: { user: { id: string; empresaId: string } }, organizationCompanyId?: string) {
    const resolvedContext = await this.tenancy.resolveForUser(
      request.user.id,
      request.user.empresaId,
      organizationCompanyId,
    );
    if (!resolvedContext.accesoEmpresaId) {
      throw new UnauthorizedException('No existe un acceso activo al contexto solicitado');
    }
    request.user = { ...request.user, ...resolvedContext };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si el endpoint es público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const allowed = await super.canActivate(context) as boolean;
    const request = context.switchToHttp().getRequest();
    const requestedContext = request.headers['x-organizacion-empresa-id'];
    const organizationCompanyId = Array.isArray(requestedContext)
      ? requestedContext[0]
      : requestedContext;
    await this.attachTenantContext(request, organizationCompanyId);
    const allowCommercialRecovery = this.reflector.getAllAndOverride<boolean>(ALLOW_COMMERCIAL_RECOVERY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowCommercialRecovery && this.commercial) {
      await this.commercial.assertOperationalAccess(request.user.organizacionId);
    }
    return allowed;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }
    return user;
  }
}

