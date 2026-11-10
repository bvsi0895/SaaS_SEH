import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoRelacionEmpresa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TenantContext {
  organizacionId: string;
  organizacionEmpresaId: string;
  empresaId: string;
  organizacionMiembroId: string;
  accesoEmpresaId: string;
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
          ...(requestedOrganizacionEmpresaId ? { id: requestedOrganizacionEmpresaId } : { empresaId: legacyEmpresaId }),
        },
      },
      select: {
        id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true,
        organizacionEmpresa: { select: { organizacion: { select: { nombre: true } }, empresa: { select: { nombre: true } } } },
      },
    });

    if (!access) throw new ForbiddenException('No existe un acceso activo al contexto solicitado');
    return {
      organizacionId: access.organizacionId,
      organizacionEmpresaId: access.organizacionEmpresaId,
      empresaId: access.empresaId,
      organizacionMiembroId: access.organizacionMiembroId,
      accesoEmpresaId: access.id,
      organizacionNombre: access.organizacionEmpresa?.organizacion?.nombre,
      empresaNombre: access.organizacionEmpresa?.empresa?.nombre,
    };
  }

  async listForUser(usuarioId: string): Promise<TenantContext[]> {
    const accesses = await this.prisma.accesoEmpresa.findMany({
      where: {
        activo: true,
        organizacionMiembro: { usuarioId, activa: true, organizacion: { activa: true } },
        organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
      },
      select: {
        id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true,
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
      organizacionNombre: access.organizacionEmpresa?.organizacion?.nombre,
      empresaNombre: access.organizacionEmpresa?.empresa?.nombre,
    }));
  }

  async listEstablishmentsForAccess(accesoEmpresaId: string, empresaId: string) {
    const scoped = await this.prisma.accesoEstablecimiento.findMany({
      where: { accesoEmpresaId, establecimiento: { empresaId } },
      select: { establecimientoId: true },
    });
    return this.prisma.establecimiento.findMany({
      where: {
        empresaId,
        ...(scoped.length > 0 ? { id: { in: scoped.map((item) => item.establecimientoId) } } : {}),
        activo: true,
      },
      select: { id: true, nombre: true, codigo: true, direccion: true },
      orderBy: { nombre: 'asc' },
    });
  }

  assertResource(organizacionEmpresaId: string | null | undefined, context: TenantContext): void {
    if (!organizacionEmpresaId || organizacionEmpresaId !== context.organizacionEmpresaId) {
      throw new NotFoundException('Recurso no encontrado');
    }
  }
}
