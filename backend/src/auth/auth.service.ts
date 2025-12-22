import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
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
    const tokens = await this.generateTokens(usuario);

    // Actualizar último acceso y guardar refresh token
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        ultimoAcceso: new Date(),
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      },
    });

    return {
      ...tokens,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        activo: usuario.activo,
      },
    };
  }

  /**
   * Registrar nuevo usuario
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar que el email no existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar que la empresa existe y está activa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: registerDto.empresaId },
    });

    if (!empresa) {
      throw new BadRequestException('Empresa no encontrada');
    }

    if (!empresa.activa) {
      throw new BadRequestException('Empresa desactivada');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crear usuario
    const usuario = await this.prisma.usuario.create({
      data: {
        email: registerDto.email.toLowerCase(),
        password: hashedPassword,
        nombre: registerDto.nombre,
        apellido: registerDto.apellido,
        rol: registerDto.rol || 'TECNICO',
        empresaId: registerDto.empresaId,
      },
    });

    // Generar tokens
    const tokens = await this.generateTokens(usuario);

    // Guardar refresh token
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      },
    });

    return {
      ...tokens,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        activo: usuario.activo,
      },
    };
  }

  /**
   * Refrescar token de acceso
   */
  async refreshTokens(userId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, usuario.refreshToken);

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const tokens = await this.generateTokens(usuario);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      },
    });

    return tokens;
  }

  /**
   * Cerrar sesión (invalidar refresh token)
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        refreshToken: null,
      },
    });
  }

  /**
   * Generar access token y refresh token
   */
  private async generateTokens(usuario: { id: string; email: string; empresaId: string; rol: string }) {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
