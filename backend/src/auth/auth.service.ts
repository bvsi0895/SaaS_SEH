import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { EstadoRelacionEmpresa, Rol, RolOrganizacion } from '@prisma/client';
import { TenancyService } from '../tenancy/tenancy.service';
import { SaasCommercialService } from '../saas/saas-commercial.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tenancy: TenancyService,
    @Optional() private commercial?: SaasCommercialService,
  ) {}

  /**
   * Validar credenciales de usuario
   */
  async validateUser(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
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
      return null;
    }

    const passwordValid = await bcrypt.compare(password, usuario.password);

    if (!passwordValid) {
      return null;
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    if (!usuario.empresa.activa) {
      throw new UnauthorizedException('Empresa desactivada');
    }

    const { password: _, refreshToken: __, ...result } = usuario;
    return result;
  }

  /**
   * Login de usuario
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const usuario = await this.validateUser(loginDto.email, loginDto.password);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const context = await this.tenancy.resolveForUser(usuario.id, usuario.empresaId);
    const tokens = await this.generateTokens(usuario, context);

    // Actualizar último acceso y guardar refresh token
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        ultimoAcceso: new Date(),
        refreshToken: this.hashRefreshToken(tokens.refreshToken),
      },
    });

    return {
      ...tokens,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: context.rol ?? usuario.rol,
        rolOrganizacion: context.rolOrganizacion,
        empresaId: usuario.empresaId,
        activo: usuario.activo,
      },
    };
  }

  /**
   * Registrar nuevo usuario
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const empresaId = this.configService.get<string>('PUBLIC_REGISTRATION_EMPRESA_ID');
    const organizacionEmpresaId = this.configService.get<string>('PUBLIC_REGISTRATION_ORGANIZACION_EMPRESA_ID');
    if (!empresaId || !organizacionEmpresaId) {
      throw new BadRequestException('El registro público no está habilitado');
    }

    // Verificar que el email no existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar que la empresa existe y está activa
    const defaultContext = await this.prisma.organizacionEmpresa.findUnique({
      where: { id: organizacionEmpresaId },
      include: { empresa: true },
    });

    if (!defaultContext || defaultContext.empresaId !== empresaId) {
      throw new BadRequestException('Empresa no encontrada');
    }

    if (!defaultContext.empresa.activa || defaultContext.estado !== EstadoRelacionEmpresa.ACTIVA) {
      throw new BadRequestException('Empresa desactivada');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crear la identidad y sus accesos dentro de la misma transacción que
    // reserva el cupo del plan comercial.
    const usuario = await this.prisma.$transaction(async (tx) => {
      await this.commercial?.assertCapacityInTransaction(tx, defaultContext.organizacionId, 'usuarios');
      const created = await tx.usuario.create({
        data: {
          email: registerDto.email.toLowerCase(),
          password: hashedPassword,
          nombre: registerDto.nombre,
          apellido: registerDto.apellido,
          rol: Rol.TECNICO,
          empresaId,
        },
      });

      const membership = await tx.organizacionMiembro.create({
        data: {
          id: randomUUID(),
          organizacionId: defaultContext.organizacionId,
          usuarioId: created.id,
          rol: RolOrganizacion.AUDITOR_ORGANIZACION,
          activa: true,
        },
      });

      await tx.accesoEmpresa.create({
        data: {
          id: randomUUID(),
          organizacionEmpresaId: defaultContext.id,
          organizacionMiembroId: membership.id,
          organizacionId: defaultContext.organizacionId,
          empresaId,
          rol: Rol.TECNICO,
          activo: true,
        },
      });
      return created;
    });

    // Generar tokens
    const context = await this.tenancy.resolveForUser(usuario.id, usuario.empresaId);
    const tokens = await this.generateTokens(usuario, context);

    // Guardar refresh token
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: this.hashRefreshToken(tokens.refreshToken),
      },
    });

    return {
      ...tokens,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: context.rol ?? usuario.rol,
        rolOrganizacion: context.rolOrganizacion,
        empresaId: usuario.empresaId,
        activo: usuario.activo,
      },
    };
  }

  /**
   * Refrescar token de acceso
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }

    if (payload.tokenType !== 'refresh' || !payload.jti || !payload.sub || typeof payload.tokenVersion !== 'number') {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario || !usuario.refreshToken || usuario.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token de refresco revocado');
    }

    const refreshTokenMatches = await this.matchesRefreshToken(refreshToken, usuario.refreshToken);

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Token de refresco inválido');
    }

    // El contexto incluido en el refresh token no es autoridad por sí mismo:
    // se vuelve a resolver contra membresías, relación y acceso vigentes.
    // Esto preserva el contexto activo sin reactivar accesos revocados.
    let context: Awaited<ReturnType<TenancyService['resolveForUser']>>;
    try {
      context = await this.tenancy.resolveForUser(
        usuario.id,
        usuario.empresaId,
        payload.organizacionEmpresaId,
      );
    } catch {
      throw new UnauthorizedException('El contexto del token de refresco ya no está autorizado');
    }

    const tokens = await this.generateTokens(usuario, context);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: this.hashRefreshToken(tokens.refreshToken),
      },
    });

    return tokens;
  }

  /**
   * Cerrar sesión e invalidar todas las sesiones del usuario.
   *
   * La actualización única es atómica: cualquier access token o refresh
   * token emitido con la versión anterior queda revocado inmediatamente.
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        refreshToken: null,
      },
    });
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken, 'utf8').digest('hex');
  }

  private async matchesRefreshToken(refreshToken: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('$2')) {
      // Compatibility with hashes created before full-token hashing was introduced.
      return bcrypt.compare(refreshToken, storedHash);
    }

    const presentedHash = Buffer.from(this.hashRefreshToken(refreshToken), 'utf8');
    const persistedHash = Buffer.from(storedHash, 'utf8');
    return presentedHash.length === persistedHash.length && timingSafeEqual(presentedHash, persistedHash);
  }

  /**
   * Generar access token y refresh token
   */
  private async generateTokens(
    usuario: { id: string; email: string; empresaId: string; rol: string; tokenVersion: number },
    resolvedContext?: Awaited<ReturnType<TenancyService['resolveForUser']>>,
  ) {
    const context = resolvedContext || await this.tenancy.resolveForUser(usuario.id, usuario.empresaId);
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      empresaId: usuario.empresaId,
      rol: context.rol ?? usuario.rol,
      tokenVersion: usuario.tokenVersion,
      organizacionEmpresaId: context.organizacionEmpresaId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, tokenType: 'access' as const, jti: randomUUID() }, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '7d',
      }),
      this.jwtService.signAsync({ ...payload, tokenType: 'refresh' as const, jti: randomUUID() }, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

