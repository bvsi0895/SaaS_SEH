import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto, UpdateUsuarioDto, ChangePasswordDto, AdminChangePasswordDto } from './dto';
import { Rol } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los usuarios de una empresa
   */
  async findAll(empresaId: string, filters?: { rol?: Rol; activo?: boolean }) {
    return this.prisma.usuario.findMany({
      where: {
        empresaId,
        ...(filters?.rol && { rol: filters.rol }),
        ...(filters?.activo !== undefined && { activo: filters.activo }),
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        createdAt: true,
        empresaId: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtener un usuario por ID
   */
  async findOne(id: string, empresaId?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        createdAt: true,
        updatedAt: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar que pertenece a la misma empresa
    if (empresaId && usuario.empresaId !== empresaId) {
      throw new ForbiddenException('No tiene permiso para ver este usuario');
    }

    return usuario;
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Crear nuevo usuario
   */
  async create(createUsuarioDto: CreateUsuarioDto) {
    // Verificar que el email no existe
    const existingUser = await this.findByEmail(createUsuarioDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: createUsuarioDto.empresaId },
    });

    if (!empresa) {
      throw new BadRequestException('Empresa no encontrada');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    // Crear usuario
    const usuario = await this.prisma.usuario.create({
      data: {
        email: createUsuarioDto.email.toLowerCase(),
        password: hashedPassword,
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        rol: createUsuarioDto.rol || Rol.TECNICO,
        empresaId: createUsuarioDto.empresaId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        empresaId: true,
      },
    });

    return usuario;
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, updateUsuarioDto: UpdateUsuarioDto, empresaId?: string) {
    // Verificar que existe
    const usuario = await this.findOne(id, empresaId);

    // Actualizar
    return this.prisma.usuario.update({
      where: { id },
      data: updateUsuarioDto,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        updatedAt: true,
        empresaId: true,
      },
    });
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(changePasswordDto.currentPassword, usuario.password);
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Actualizar
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async adminChangePassword(id: string, empresaId: string, dto: AdminChangePasswordDto) {
    await this.findOne(id, empresaId);
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { password: hashedPassword, refreshToken: null },
    });
    return { message: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivate(id: string, empresaId?: string) {
    await this.findOne(id, empresaId);

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        activo: true,
      },
    });
  }

  /**
   * Reactivar usuario
   */
  async activate(id: string, empresaId?: string) {
    await this.findOne(id, empresaId);

    return this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        activo: true,
      },
    });
  }

  /**
   * Eliminar usuario permanentemente
   */
  async remove(id: string, empresaId?: string) {
    await this.findOne(id, empresaId);

    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'Usuario eliminado exitosamente' };
  }
}
