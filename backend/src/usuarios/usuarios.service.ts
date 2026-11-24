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
import { EstadoRelacionEmpresa, Rol } from '@prisma/client';
import { RolOrganizacion } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private withContextualRole(user: any) {
    const contextualRole = user.membresiasOrganizacion
      ?.flatMap((membership: any) => membership.accesosEmpresa || [])
      .map((access: any) => access.rol)
      .find(Boolean);
    const { membresiasOrganizacion: _scopedMemberships, ...result } = user;
    return { ...result, rol: contextualRole || user.rol };
  }

  /**
   * Obtener todos los usuarios de una empresa
   */
  async findAll(empresaId: string, filters?: { rol?: Rol; activo?: boolean }, organizacionId?: string, organizacionEmpresaId?: string) {
    const scopedMembership = organizacionId && organizacionEmpresaId
      ? {
          membresiasOrganizacion: {
            some: {
              organizacionId,
              activa: true,
              accesosEmpresa: {
                some: {
                  organizacionEmpresaId,
                  empresaId,
                  activo: true,
                  organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                  ...(filters?.rol && { rol: filters.rol }),
                },
              },
            },
          },
        }
      : organizacionId
        ? { membresiasOrganizacion: { some: { organizacionId, activa: true } } }
        : {};
    const users = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        ...scopedMembership,
        ...(!organizacionEmpresaId && filters?.rol && { rol: filters.rol }),
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
        ...(organizacionId && organizacionEmpresaId && {
          membresiasOrganizacion: {
            where: { organizacionId, activa: true },
            select: {
              accesosEmpresa: {
                where: { organizacionEmpresaId, empresaId, activo: true },
                select: { rol: true },
              },
            },
          },
        }),
      },
      orderBy: { nombre: 'asc' },
    });
    return users.map((user: any) => this.withContextualRole(user));
  }

  async findAuthorizedTechnicians(empresaId: string, organizacionEmpresaId: string) {
    const users = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        activo: true,
        membresiasOrganizacion: {
          some: {
            activa: true,
            accesosEmpresa: {
              some: {
                empresaId,
                organizacionEmpresaId,
                activo: true,
                organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                rol: Rol.TECNICO,
              },
            },
          },
        },
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
        membresiasOrganizacion: {
          where: { activa: true },
          select: {
            accesosEmpresa: {
              where: { organizacionEmpresaId, empresaId, activo: true },
              select: { rol: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return users.map((user: any) => this.withContextualRole(user));
  }

  async findResolutionResponsibles(
    empresaId: string,
    organizacionEmpresaId: string,
    establecimientoId?: string,
  ) {
    const users = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        activo: true,
        membresiasOrganizacion: {
          some: {
            activa: true,
            accesosEmpresa: {
              some: {
                empresaId,
                organizacionEmpresaId,
                activo: true,
                organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                rol: { in: [Rol.ADMIN_EMPRESA, Rol.SUPERVISOR, Rol.TECNICO] },
                ...(establecimientoId && {
                  OR: [
                    { rol: { in: [Rol.ADMIN_EMPRESA, Rol.SUPERVISOR] } },
                    {
                      rol: Rol.TECNICO,
                      establecimientos: {
                        some: {
                          establecimientoId,
                          establecimiento: { empresaId, activo: true },
                        },
                      },
                    },
                  ],
                }),
              },
            },
          },
        },
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
        membresiasOrganizacion: {
          where: { activa: true },
          select: {
            accesosEmpresa: {
              where: { organizacionEmpresaId, empresaId, activo: true },
              select: { rol: true },
            },
          },
        },
      },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    });
    return users.map((user: any) => this.withContextualRole(user));
  }

  /**
   * Obtener un usuario por ID
   */
  async findOne(id: string, empresaId?: string, organizacionId?: string, organizacionEmpresaId?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id,
        ...(empresaId && { empresaId }),
        ...(organizacionId && organizacionEmpresaId
          ? {
              membresiasOrganizacion: {
                some: {
                  organizacionId,
                  activa: true,
                  accesosEmpresa: {
                    some: {
                      organizacionEmpresaId,
                      empresaId,
                      activo: true,
                      organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                    },
                  },
                },
              },
            }
          : organizacionId && { membresiasOrganizacion: { some: { organizacionId, activa: true } } }),
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
        updatedAt: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
          },
        },
        ...(organizacionId && organizacionEmpresaId && {
          membresiasOrganizacion: {
            where: { organizacionId, activa: true },
            select: {
              accesosEmpresa: {
                where: { organizacionEmpresaId, empresaId, activo: true },
                select: { rol: true },
              },
            },
          },
        }),
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.withContextualRole(usuario);
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
  async create(
    createUsuarioDto: CreateUsuarioDto,
    empresaId: string,
    organizacionId?: string,
    organizacionEmpresaId?: string,
  ) {
    // Verificar que el email no existe
    const existingUser = await this.findByEmail(createUsuarioDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar que la empresa existe
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) {
      throw new BadRequestException('Empresa no encontrada');
    }

    if (organizacionId && organizacionEmpresaId) {
      const relacion = await this.prisma.organizacionEmpresa.findUnique({
        where: { id: organizacionEmpresaId },
        select: { id: true, organizacionId: true, empresaId: true, estado: true },
      });
      if (
        !relacion ||
        relacion.organizacionId !== organizacionId ||
        relacion.empresaId !== empresaId ||
        relacion.estado !== EstadoRelacionEmpresa.ACTIVA
      ) {
        throw new ForbiddenException('La empresa no pertenece a la organización activa');
      }
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    const usuario = await this.prisma.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: {
          email: createUsuarioDto.email.toLowerCase(),
          password: hashedPassword,
          nombre: createUsuarioDto.nombre,
          apellido: createUsuarioDto.apellido,
          rol: createUsuarioDto.rol || Rol.TECNICO,
          empresaId,
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

      if (organizacionId && organizacionEmpresaId) {
        const membership = await tx.organizacionMiembro.create({
          data: {
            id: randomUUID(),
            organizacionId,
            usuarioId: created.id,
            rol: RolOrganizacion.AUDITOR_ORGANIZACION,
            activa: true,
          },
        });
        await tx.accesoEmpresa.create({
          data: {
            id: randomUUID(),
            organizacionEmpresaId,
            organizacionMiembroId: membership.id,
            organizacionId,
            empresaId,
            rol: createUsuarioDto.rol || Rol.TECNICO,
            activo: true,
          },
        });
      }
      return created;
    });

    return usuario;
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, updateUsuarioDto: UpdateUsuarioDto, empresaId?: string, organizacionId?: string, organizacionEmpresaId?: string) {
    // Verificar que existe
    await this.findOne(id, empresaId, organizacionId, organizacionEmpresaId);

    // El rol operativo vive en AccesoEmpresa. Nunca debe cambiarse el rol
    // global cuando se administra a un usuario desde una relación concreta.
    const { rol, ...accountData } = updateUsuarioDto;
    if (rol && organizacionId && organizacionEmpresaId) {
      const access = await this.prisma.accesoEmpresa.findFirst({
        where: {
          organizacionId,
          organizacionEmpresaId,
          empresaId,
          organizacionMiembro: { usuarioId: id },
        },
        select: { id: true },
      });
      if (!access) throw new NotFoundException('Acceso del usuario no encontrado');
      await this.prisma.accesoEmpresa.update({ where: { id: access.id }, data: { rol } });
    }

    // Actualizar
    return this.prisma.usuario.update({
      where: { id },
      data: accountData,
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
      data: { password: hashedPassword, refreshToken: null },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  async adminChangePassword(id: string, empresaId: string, dto: AdminChangePasswordDto, organizacionId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionId, organizacionEmpresaId);
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
  async deactivate(id: string, empresaId?: string, organizacionId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionId, organizacionEmpresaId);

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
  async activate(id: string, empresaId?: string, organizacionId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionId, organizacionEmpresaId);

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
  async remove(id: string, empresaId?: string, organizacionId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionId, organizacionEmpresaId);

    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'Usuario eliminado exitosamente' };
  }
}

