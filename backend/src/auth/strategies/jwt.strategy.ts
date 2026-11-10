import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenancyService } from '../../tenancy/tenancy.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  empresaId: string;
  rol: string;
  organizacionEmpresaId?: string;
}

/**
 * Estrategia JWT para Passport
 * Valida tokens JWT y carga el usuario correspondiente
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private tenancy: TenancyService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Buscar usuario en la base de datos
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            activa: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    if (!usuario.empresa.activa) {
      throw new UnauthorizedException('Empresa desactivada');
    }

    // Retornar usuario sin password
    const { password, refreshToken, ...result } = usuario;
    const context = await this.tenancy.resolveForUser(
      usuario.id,
      usuario.empresaId,
      payload.organizacionEmpresaId,
    );
    return { ...result, ...context };
  }
}
