import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto';
import { EstadoRelacionEmpresa, Rol, RolOrganizacion } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class EmpresasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todas las empresas (solo para super admin)
   */
  async findAll() {
    return this.prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        cuit: true,
        logoUrl: true,
        activa: true,
        createdAt: true,
        _count: {
          select: {
            usuarios: true,
            inspecciones: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtener empresa por ID
   */
  async findOne(id: string, organizacionEmpresaId?: string, organizacionId?: string) {
    if (organizacionEmpresaId && !organizacionId) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const empresa = await this.prisma.empresa.findFirst({
      where: {
        id,
        ...(organizacionEmpresaId && {
          activa: true,
          organizaciones: {
            some: {
              id: organizacionEmpresaId,
              organizacionId,
              estado: EstadoRelacionEmpresa.ACTIVA,
            },
          },
        }),
      },
      include: {
        _count: {
          select: {
            usuarios: true,
            inspecciones: true,
            accionesCorrectivas: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (organizacionEmpresaId) {
      const [usuarios, checklists, inspecciones, accionesCorrectivas] = await Promise.all([
        this.prisma.usuario.count({
          where: { empresaId: id, membresiasOrganizacion: { some: { organizacion: { empresas: { some: { id: organizacionEmpresaId } } }, activa: true } } },
        }),
        this.prisma.checklist.count({ where: { organizacionId: organizacionId || '__invalid_context__' } }),
        this.prisma.inspeccion.count({ where: { empresaId: id, organizacionEmpresaId } }),
        this.prisma.accionCorrectiva.count({ where: { empresaId: id, organizacionEmpresaId } }),
      ]);

      return {
        ...empresa,
        _count: { usuarios, checklists, inspecciones, accionesCorrectivas },
      };
    }

    return empresa;
  }

  /**
   * Crear nueva empresa
   */
  async create(createEmpresaDto: CreateEmpresaDto, organizacionId?: string, usuarioId?: string) {
    if (!organizacionId || !usuarioId) {
      throw new ForbiddenException('La empresa debe crearse dentro de una organización autorizada');
    }

    const member = await this.prisma.organizacionMiembro.findFirst({
      where: {
        organizacionId,
        usuarioId,
        activa: true,
        organizacion: { activa: true },
        rol: { in: [RolOrganizacion.OWNER, RolOrganizacion.ADMIN_ORGANIZACION] },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException('Se requiere un rol administrador de la organización');

    // Verificar CUIT único si se proporciona
    if (createEmpresaDto.cuit) {
      const existing = await this.prisma.empresa.findUnique({
        where: { cuit: createEmpresaDto.cuit },
      });

      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({ data: createEmpresaDto });
      const relation = await tx.organizacionEmpresa.create({
        data: { id: randomUUID(), organizacionId, empresaId: empresa.id },
      });
      await tx.accesoEmpresa.create({
        data: {
          id: randomUUID(),
          organizacionEmpresaId: relation.id,
          organizacionMiembroId: member.id,
          organizacionId,
          empresaId: empresa.id,
          rol: Rol.ADMIN_EMPRESA,
          activo: true,
        },
      });
      return relation;
    });
  }

  /**
   * Actualizar empresa
   */
  async update(id: string, updateEmpresaDto: UpdateEmpresaDto, requestingEmpresaId?: string, organizacionEmpresaId?: string, organizacionId?: string) {
    // Verificar que existe
    await this.findOne(id, organizacionEmpresaId, organizacionId);

    // Verificar permisos (solo puede actualizar su propia empresa)
    if (requestingEmpresaId && id !== requestingEmpresaId) {
      throw new ForbiddenException('No tiene permiso para actualizar esta empresa');
    }

    // Verificar CUIT único si se está actualizando
    if (updateEmpresaDto.cuit) {
      const existing = await this.prisma.empresa.findFirst({
        where: {
          cuit: updateEmpresaDto.cuit,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    return this.prisma.empresa.update({
      where: { id },
      data: updateEmpresaDto,
    });
  }

  /**
   * Desactivar empresa
   */
  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { activa: false },
    });
  }

  /**
   * Reactivar empresa
   */
  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.empresa.update({
      where: { id },
      data: { activa: true },
    });
  }

  /**
   * Obtener estadísticas de la empresa
   */
  async getStats(empresaId: string, organizacionEmpresaId?: string) {
    const scope = organizacionEmpresaId ? { organizacionEmpresaId } : {};
    const [empresa, inspecciones, hallazgos, acciones] = await Promise.all([
      this.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { nombre: true },
      }),
      this.prisma.inspeccion.count({ where: { empresaId, ...scope } }),
      this.prisma.hallazgo.count({
        where: { inspeccion: { empresaId, ...scope } },
      }),
      this.prisma.accionCorrectiva.count({ where: { empresaId, ...scope } }),
    ]);

    return {
      empresa: empresa?.nombre,
      totalInspecciones: inspecciones,
      totalHallazgos: hallazgos,
      totalAccionesCorrectivas: acciones,
    };
  }
}

