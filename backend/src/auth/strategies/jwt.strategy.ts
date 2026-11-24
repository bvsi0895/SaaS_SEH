import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

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

    // Retornar usuario sin password. El contexto operativo se resuelve en
    // JwtAuthGuard, después de leer X-Organizacion-Empresa-Id. No se debe
    // bloquear aquí por el vínculo que quedó embebido en un JWT antiguo:
    // revocar una consultora no revoca el resto de accesos del usuario.
    const { password, refreshToken, ...result } = usuario;
    return result;
  }
}
