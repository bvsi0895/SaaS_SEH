import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto';

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
            checklists: true,
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
  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            checklists: true,
            inspecciones: true,
            accionesCorrectivas: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }

  /**
   * Crear nueva empresa
   */
  async create(createEmpresaDto: CreateEmpresaDto) {
    // Verificar CUIT único si se proporciona
    if (createEmpresaDto.cuit) {
      const existing = await this.prisma.empresa.findUnique({
        where: { cuit: createEmpresaDto.cuit },
      });

      if (existing) {
        throw new ConflictException('El CUIT ya está registrado');
      }
    }

    return this.prisma.empresa.create({
      data: createEmpresaDto,
    });
  }

  /**
   * Actualizar empresa
   */
  async update(id: string, updateEmpresaDto: UpdateEmpresaDto, requestingEmpresaId?: string) {
    // Verificar que existe
    await this.findOne(id);

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
  async getStats(empresaId: string) {
    const [empresa, inspecciones, hallazgos, acciones] = await Promise.all([
      this.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { nombre: true },
      }),
      this.prisma.inspeccion.count({ where: { empresaId } }),
      this.prisma.hallazgo.count({
        where: { inspeccion: { empresaId } },
      }),
      this.prisma.accionCorrectiva.count({ where: { empresaId } }),
    ]);

    return {
      empresa: empresa?.nombre,
      totalInspecciones: inspecciones,
      totalHallazgos: hallazgos,
      totalAccionesCorrectivas: acciones,
    };
  }
}
