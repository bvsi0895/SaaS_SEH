import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoRelacionEmpresa, Rol, RolOrganizacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TenantContext {
  organizacionId: string;
  organizacionEmpresaId: string;
  empresaId: string;
  organizacionMiembroId: string;
  accesoEmpresaId: string;
  /** Rol operativo del acceso activo; nunca el rol legacy de Usuario. */
  rol?: Rol;
  /** Rol dentro de la consultora, usado por la biblioteca de checklists. */
  rolOrganizacion?: RolOrganizacion;
  organizacionNombre?: string;
  empresaNombre?: string;
}

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(usuarioId: string, legacyEmpresaId: string, requestedOrganizacionEmpresaId?: string): Promise<TenantContext> {
    const access = await this.prisma.accesoEmpresa.findFirst({
      where: {
        activo: true,
        organizacionMiembro: { usuarioId, activa: true, organizacion: { activa: true } },
        organizacionEmpresa: {
          estado: EstadoRelacionEmpresa.ACTIVA,
          empresa: { activa: true },
          ...(requestedOrganizacionEmpresaId ? { id: requestedOrganizacionEmpresaId } : { empresaId: legacyEmpresaId }),
        },
      },
      select: {
        id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true,
        rol: true,
        organizacionMiembro: { select: { rol: true } },
        organizacionEmpresa: { select: { organizacion: { select: { nombre: true } }, empresa: { select: { nombre: true } } } },
      },
      orderBy: { organizacionEmpresaId: 'asc' },
    });

    if (!access) throw new ForbiddenException('No existe un acceso activo al contexto solicitado');
    return {
      organizacionId: access.organizacionId,
      organizacionEmpresaId: access.organizacionEmpresaId,
      empresaId: access.empresaId,
      organizacionMiembroId: access.organizacionMiembroId,
      accesoEmpresaId: access.id,
      rol: access.rol,
      rolOrganizacion: access.organizacionMiembro?.rol,
      organizacionNombre: access.organizacionEmpresa?.organizacion?.nombre,
      empresaNombre: access.organizacionEmpresa?.empresa?.nombre,
    };
  }

  async listForUser(usuarioId: string): Promise<TenantContext[]> {
    const accesses = await this.prisma.accesoEmpresa.findMany({
      where: {
        activo: true,
        organizacionMiembro: { usuarioId, activa: true, organizacion: { activa: true } },
        organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA, empresa: { activa: true } },
      },
      select: {
        id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true,
        rol: true,
        organizacionMiembro: { select: { rol: true } },
        organizacionEmpresa: { select: { organizacion: { select: { nombre: true } }, empresa: { select: { nombre: true } } } },
      },
      orderBy: { organizacionEmpresaId: 'asc' },
    });
    return accesses.map((access) => ({
      organizacionId: access.organizacionId,
      organizacionEmpresaId: access.organizacionEmpresaId,
      empresaId: access.empresaId,
      organizacionMiembroId: access.organizacionMiembroId,
      accesoEmpresaId: access.id,
      rol: access.rol,
      rolOrganizacion: access.organizacionMiembro?.rol,
      organizacionNombre: access.organizacionEmpresa?.organizacion?.nombre,
      empresaNombre: access.organizacionEmpresa?.empresa?.nombre,
    }));
  }

  async listEstablishmentsForAccess(accesoEmpresaId: string, empresaId: string) {
    const scope = await this.getEstablishmentScope(accesoEmpresaId, empresaId);
    return this.prisma.establecimiento.findMany({
      where: {
        empresaId,
        ...(scope !== undefined ? { id: { in: scope } } : {}),
        activo: true,
      },
      select: { id: true, nombre: true, codigo: true, direccion: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Returns undefined for administrative access (all establishments), and an
   * explicit list for technicians. An empty list is intentional: a technician
   * without assignments must not inherit access to the whole company.
   */
  async getEstablishmentScope(accesoEmpresaId: string, empresaId: string, organizacionEmpresaId?: string): Promise<string[] | undefined> {
    const access = await this.prisma.accesoEmpresa.findFirst({
      where: {
        id: accesoEmpresaId,
        empresaId,
        ...(organizacionEmpresaId ? { organizacionEmpresaId } : {}),
        activo: true,
        organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA, empresa: { activa: true } },
      },
      select: { rol: true, establecimientos: { select: { establecimientoId: true, establecimiento: { select: { empresaId: true, activo: true } } } } },
    });
    if (!access) throw new ForbiddenException('No existe un acceso activo al contexto solicitado');
    if (access.rol !== Rol.TECNICO) return undefined;
    return access.establecimientos.filter((item) => item.establecimiento.empresaId === empresaId && item.establecimiento.activo).map((item) => item.establecimientoId);
  }

  assertResource(organizacionEmpresaId: string | null | undefined, context: TenantContext): void {
    if (!organizacionEmpresaId || organizacionEmpresaId !== context.organizacionEmpresaId) {
      throw new NotFoundException('Recurso no encontrado');
    }
  }
}
