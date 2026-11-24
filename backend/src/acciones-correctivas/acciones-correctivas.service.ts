import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccionCorrectivaDto, UpdateAccionCorrectivaDto, CerrarAccionDto } from './dto';
import { EstadoAccion, EstadoRelacionEmpresa, Rol } from '@prisma/client';
import { TenancyService } from '../tenancy/tenancy.service';
import { HallazgosService } from '../hallazgos/hallazgos.service';

@Injectable()
export class AccionesCorrectivasService {
  constructor(private prisma: PrismaService, @Optional() private tenancy?: TenancyService, @Optional() private hallazgos?: HallazgosService) {}

  /**
   * Obtener todas las acciones correctivas de una empresa
   */
  async findAll(
    empresaId: string,
    filters?: {
      estado?: EstadoAccion;
      responsableId?: string;
      hallazgoId?: string;
      vencidas?: boolean;
      fechaDesde?: Date;
      fechaHasta?: Date;
      establecimientoId?: string;
    },
    organizacionEmpresaId?: string,
    accesoEmpresaId?: string,
  ) {
    const now = new Date();
    const allowed = this.tenancy && accesoEmpresaId ? await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId, organizacionEmpresaId) : undefined;
    if (filters?.establecimientoId && allowed !== undefined && !allowed.includes(filters.establecimientoId)) throw new NotFoundException('Establecimiento no encontrado');
    const establishmentFilter = filters?.establecimientoId ? { establecimientoId: filters.establecimientoId } : allowed !== undefined ? { establecimientoId: { in: allowed } } : {};

    return this.prisma.accionCorrectiva.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(filters?.estado && { estado: filters.estado }),
        ...(filters?.responsableId && { responsableId: filters.responsableId }),
        ...(filters?.hallazgoId && { hallazgoId: filters.hallazgoId }),
        ...(filters?.vencidas && {
          fechaCompromiso: { lt: now },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        }),
        ...(filters?.fechaDesde && { createdAt: { gte: filters.fechaDesde } }),
        ...(filters?.fechaHasta && { createdAt: { lte: filters.fechaHasta } }),
        hallazgo: { inspeccion: establishmentFilter },
      },
      include: {
        hallazgo: {
          select: {
            id: true,
            titulo: true,
            nivelRiesgo: true,
            inspeccion: {
              select: { id: true, sector: true },
            },
          },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
        creador: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: { fechaCompromiso: 'asc' },
    });
  }

  /**
   * Obtener acción correctiva por ID
   */
  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string, responsableId?: string, accesoEmpresaId?: string) {
    const accion = await this.prisma.accionCorrectiva.findUnique({
      where: { id },
      include: {
        hallazgo: {
          include: {
            inspeccion: {
              select: {
                id: true,
                sector: true,
                checklist: { select: { nombre: true } },
                establecimientoId: true,
              },
            },
          },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        creador: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    if (!accion) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }

    if (empresaId && accion.empresaId !== empresaId) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }
    if (organizacionEmpresaId && accion.organizacionEmpresaId !== organizacionEmpresaId) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }
    if (responsableId && accion.responsableId !== responsableId) {
      throw new NotFoundException('Acción correctiva no encontrada');
    }
    if (responsableId && this.tenancy && accesoEmpresaId) {
      const allowed = await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId || accion.empresaId, organizacionEmpresaId);
      if (!accion.hallazgo.inspeccion.establecimientoId || (allowed !== undefined && !allowed.includes(accion.hallazgo.inspeccion.establecimientoId))) throw new NotFoundException('Acción correctiva no encontrada');
    }

    return accion;
  }

  /**
   * Crear nueva acción correctiva
   */
  async create(
    createDto: CreateAccionCorrectivaDto,
    creadorId: string,
    empresaId: string,
    organizacionEmpresaId?: string,
  ) {
    // Verificar que el hallazgo existe
    const hallazgo = await this.prisma.hallazgo.findUnique({
      where: { id: createDto.hallazgoId },
      include: { inspeccion: true },
    });

    if (!hallazgo) {
      throw new NotFoundException('Hallazgo no encontrado');
    }

    if (hallazgo.inspeccion.empresaId !== empresaId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }
    if (organizacionEmpresaId && hallazgo.inspeccion.organizacionEmpresaId !== organizacionEmpresaId) {
      throw new NotFoundException('Hallazgo no encontrado');
    }
    if (hallazgo.estado === 'SOLUCIONADO') {
      throw new BadRequestException('No se puede crear una acción para un hallazgo solucionado');
    }

    // Verificar responsable si se proporciona ID
    if (createDto.responsableId) {
      const responsable = await this.prisma.usuario.findFirst({
        where: {
          id: createDto.responsableId,
          empresaId,
          activo: true,
          ...(organizacionEmpresaId && {
            membresiasOrganizacion: {
              some: {
                activa: true,
                accesosEmpresa: {
                  some: {
                    organizacionEmpresaId,
                    empresaId,
                    activo: true,
                    organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
                    ...(hallazgo.inspeccion.establecimientoId
                      ? {
                          OR: [
                            { rol: { in: [Rol.ADMIN_EMPRESA, Rol.SUPERVISOR] } },
                            {
                              rol: Rol.TECNICO,
                              establecimientos: {
                                some: {
                                  establecimientoId: hallazgo.inspeccion.establecimientoId,
                                  establecimiento: { empresaId, activo: true },
                                },
                              },
                            },
                          ],
                        }
                      : { rol: { in: [Rol.ADMIN_EMPRESA, Rol.SUPERVISOR] } }),
                  },
                },
              },
            },
          }),
        },
      });

      if (!responsable || responsable.empresaId !== empresaId) {
        throw new BadRequestException('Responsable no encontrado');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const action = await tx.accionCorrectiva.create({
        data: {
          hallazgoId: createDto.hallazgoId,
          empresaId,
          organizacionEmpresaId,
          creadorId,
          descripcion: createDto.descripcion,
          fechaCompromiso: new Date(createDto.fechaCompromiso),
          responsableId: createDto.responsableId,
          responsableTexto: createDto.responsableTexto,
          estado: EstadoAccion.PENDIENTE,
        },
        include: {
          hallazgo: {
            select: { id: true, titulo: true },
          },
          responsable: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
      });
      if (this.hallazgos) {
        await this.hallazgos.markInCorrectionInTransaction(tx, createDto.hallazgoId, creadorId, empresaId, organizacionEmpresaId);
      }
      return action;
    });
  }

  /**
   * Actualizar acción correctiva
   */
  async update(id: string, updateDto: UpdateAccionCorrectivaDto, empresaId?: string, organizacionEmpresaId?: string, accesoEmpresaId?: string) {
    const accion = await this.findOne(id, empresaId, organizacionEmpresaId, undefined, accesoEmpresaId);

    if (accion.estado === EstadoAccion.RESUELTA) {
      throw new BadRequestException('No se puede editar una acción cerrada');
    }

    const { fechaCompromiso, ...data } = updateDto;

    return this.prisma.accionCorrectiva.update({
      where: { id },
      data: {
        ...data,
        ...(fechaCompromiso && { fechaCompromiso: new Date(fechaCompromiso) }),
      },
      include: {
        hallazgo: {
          select: { id: true, titulo: true },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });
  }

  /**
   * Cambiar estado a En Progreso
   */
  async iniciar(id: string, empresaId?: string, organizacionEmpresaId?: string, responsableId?: string, accesoEmpresaId?: string) {
    const accion = await this.findOne(id, empresaId, organizacionEmpresaId, responsableId, accesoEmpresaId);

    if (accion.estado !== EstadoAccion.PENDIENTE) {
      throw new BadRequestException('La acción ya fue iniciada');
    }

    const changed = await this.prisma.accionCorrectiva.updateMany({
      where: { id, estado: EstadoAccion.PENDIENTE },
      data: { estado: EstadoAccion.EN_PROGRESO },
    });
    if (changed.count !== 1) throw new ConflictException('La acción cambió de estado mientras se iniciaba');
    return this.prisma.accionCorrectiva.findUnique({ where: { id } });
  }

  /**
   * Cerrar acción correctiva
   */
  async cerrar(id: string, cerrarDto: CerrarAccionDto, empresaId?: string, organizacionEmpresaId?: string, responsableId?: string, accesoEmpresaId?: string) {
    const accion = await this.findOne(id, empresaId, organizacionEmpresaId, responsableId, accesoEmpresaId);

    if (accion.estado === EstadoAccion.RESUELTA) {
      throw new BadRequestException('La acción ya está cerrada');
    }

    if (cerrarDto.evidenciaUrl && this.hallazgos && empresaId) {
      await this.hallazgos.validateEvidenceUrlsForFinding(
        accion.hallazgoId,
        [cerrarDto.evidenciaUrl],
        empresaId,
        organizacionEmpresaId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.accionCorrectiva.updateMany({
        where: { id, estado: accion.estado },
        data: {
          estado: EstadoAccion.RESUELTA,
          fechaCierre: new Date(),
          notasCierre: cerrarDto.notasCierre,
          evidenciaUrl: cerrarDto.evidenciaUrl,
        },
      });
      if (changed.count !== 1) throw new ConflictException('La acción cambió de estado mientras se cerraba');
      return tx.accionCorrectiva.findUnique({ where: { id } });
    });
  }

  /**
   * Reabrir acción correctiva
   */
  async reabrir(id: string, empresaId?: string, organizacionEmpresaId?: string, accesoEmpresaId?: string, usuarioId?: string) {
    const accion = await this.findOne(id, empresaId, organizacionEmpresaId, undefined, accesoEmpresaId);

    if (accion.estado !== EstadoAccion.RESUELTA) {
      throw new BadRequestException('La acción no está cerrada');
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.accionCorrectiva.updateMany({
        where: { id, estado: EstadoAccion.RESUELTA },
        data: {
          estado: EstadoAccion.EN_PROGRESO,
          fechaCierre: null,
        },
      });
      if (changed.count !== 1) throw new ConflictException('La acción cambió de estado mientras se reabría');
      if (this.hallazgos && empresaId && usuarioId) {
        await this.hallazgos.reopenForActionInTransaction(tx, accion.hallazgoId, usuarioId, empresaId, organizacionEmpresaId);
      }
      return tx.accionCorrectiva.findUnique({ where: { id } });
    });
  }

  /**
   * Obtener acciones asignadas al usuario actual
   */
  async findMine(usuarioId: string, empresaId: string, filters?: { estado?: EstadoAccion; vencidas?: boolean; establecimientoId?: string }, organizacionEmpresaId?: string, accesoEmpresaId?: string) {
    const now = new Date();
    const allowed = this.tenancy && accesoEmpresaId ? await this.tenancy.getEstablishmentScope(accesoEmpresaId, empresaId, organizacionEmpresaId) : undefined;
    if (filters?.establecimientoId && allowed !== undefined && !allowed.includes(filters.establecimientoId)) throw new NotFoundException('Establecimiento no encontrado');
    const establishmentFilter = filters?.establecimientoId ? { establecimientoId: filters.establecimientoId } : allowed !== undefined ? { establecimientoId: { in: allowed } } : {};
    return this.prisma.accionCorrectiva.findMany({
      where: {
        responsableId: usuarioId,
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(filters?.estado && { estado: filters.estado }),
        ...(filters?.vencidas && {
          fechaCompromiso: { lt: now },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        }),
        hallazgo: { inspeccion: establishmentFilter },
      },
      include: {
        hallazgo: {
          select: {
            id: true,
            titulo: true,
            nivelRiesgo: true,
            inspeccion: { select: { sector: true } },
          },
        },
        responsable: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
      orderBy: { fechaCompromiso: 'asc' },
    });
  }

  /**
   * Obtener estadísticas de acciones correctivas
   */
  async getEstadisticas(empresaId: string, organizacionEmpresaId?: string) {
    const now = new Date();

    const [total, porEstado, vencidas, proximasVencer] = await Promise.all([
      this.prisma.accionCorrectiva.count({ where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }) } }),
      this.prisma.accionCorrectiva.groupBy({
        by: ['estado'],
        _count: true,
        where: { empresaId, ...(organizacionEmpresaId && { organizacionEmpresaId }) },
      }),
      this.prisma.accionCorrectiva.count({
        where: {
          empresaId,
          ...(organizacionEmpresaId && { organizacionEmpresaId }),
          fechaCompromiso: { lt: now },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        },
      }),
      this.prisma.accionCorrectiva.count({
        where: {
          empresaId,
          ...(organizacionEmpresaId && { organizacionEmpresaId }),
          fechaCompromiso: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 días
          },
          estado: { in: [EstadoAccion.PENDIENTE, EstadoAccion.EN_PROGRESO] },
        },
      }),
    ]);

    return {
      total,
      porEstado: porEstado.reduce(
        (acc, item) => {
          acc[item.estado] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      vencidas,
      proximasVencer,
    };
  }
}
