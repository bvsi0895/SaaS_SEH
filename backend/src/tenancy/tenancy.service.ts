import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoRelacionEmpresa } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TenantContext {
  organizacionId: string;
  organizacionEmpresaId: string;
  empresaId: string;
  organizacionMiembroId: string;
  accesoEmpresaId: string;
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
          empresaId: legacyEmpresaId,
          estado: EstadoRelacionEmpresa.ACTIVA,
          ...(requestedOrganizacionEmpresaId && { id: requestedOrganizacionEmpresaId }),
        },
      },
      select: { id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true },
    });

    if (!access) throw new ForbiddenException('No existe un acceso activo al contexto solicitado');
    return {
      organizacionId: access.organizacionId,
      organizacionEmpresaId: access.organizacionEmpresaId,
      empresaId: access.empresaId,
      organizacionMiembroId: access.organizacionMiembroId,
      accesoEmpresaId: access.id,
    };
  }

  async listForUser(usuarioId: string): Promise<TenantContext[]> {
    const accesses = await this.prisma.accesoEmpresa.findMany({
      where: {
        activo: true,
        organizacionMiembro: { usuarioId, activa: true, organizacion: { activa: true } },
        organizacionEmpresa: { estado: EstadoRelacionEmpresa.ACTIVA },
      },
      select: { id: true, organizacionId: true, empresaId: true, organizacionEmpresaId: true, organizacionMiembroId: true },
      orderBy: { organizacionEmpresaId: 'asc' },
    });
    return accesses.map((access) => ({
      organizacionId: access.organizacionId,
      organizacionEmpresaId: access.organizacionEmpresaId,
      empresaId: access.empresaId,
      organizacionMiembroId: access.organizacionMiembroId,
      accesoEmpresaId: access.id,
    }));
  }

  assertResource(organizacionEmpresaId: string | null | undefined, context: TenantContext): void {
    if (!organizacionEmpresaId || organizacionEmpresaId !== context.organizacionEmpresaId) {
      throw new NotFoundException('Recurso no encontrado');
    }
  }
}
