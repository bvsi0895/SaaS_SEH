import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoRelacionEmpresa, Rol, RolOrganizacion } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMiembroDto,
  AssignAccessDto,
  CreateEmpresaClienteDto,
  CreateEstablecimientoDto,
  LinkEmpresaDto,
  UpdateEmpresaRelationDto,
  UpdateEmpresaClienteDto,
  UpdateEstablecimientoDto,
  UpdateMiembroDto,
  UpdateOrganizacionDto,
} from './dto';

@Injectable()
export class AdministracionService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdmin(organizacionId: string, usuarioId: string) {
    const member = await this.prisma.organizacionMiembro.findFirst({
      where: { organizacionId, usuarioId, activa: true, organizacion: { activa: true } },
      select: { id: true, rol: true },
    });
    if (!member || (member.rol !== RolOrganizacion.OWNER && member.rol !== RolOrganizacion.ADMIN_ORGANIZACION)) {
      throw new ForbiddenException('Se requiere un rol administrador de la organización');
    }
    return member;
  }

  private async getRelation(organizacionId: string, organizacionEmpresaId: string, requireActive = true) {
    const relation = await this.prisma.organizacionEmpresa.findFirst({
      where: { id: organizacionEmpresaId, organizacionId, ...(requireActive && { estado: EstadoRelacionEmpresa.ACTIVA }) },
      select: { id: true, organizacionId: true, empresaId: true, estado: true },
    });
    if (!relation) throw new NotFoundException('Empresa no vinculada a la organización');
    return relation;
  }

  getOrganization(organizacionId: string) {
    return this.prisma.organizacion.findUniqueOrThrow({
      where: { id: organizacionId },
      include: { _count: { select: { miembros: true, empresas: true } } },
    });
  }

  async updateOrganization(organizacionId: string, usuarioId: string, dto: UpdateOrganizacionDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.organizacion.update({ where: { id: organizacionId }, data: dto });
  }

  async listMembers(organizacionId: string, usuarioId: string) {
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.organizacionMiembro.findMany({
      where: { organizacionId },
      select: {
        id: true, rol: true, activa: true, usuarioId: true,
        usuario: { select: { id: true, email: true, nombre: true, apellido: true, rol: true, activo: true } },
        accesosEmpresa: {
          select: {
            id: true, rol: true, activo: true, empresaId: true,
            organizacionEmpresa: { select: { id: true, empresa: { select: { nombre: true } }, estado: true } },
          },
        },
      },
      orderBy: [{ activa: 'desc' }, { usuario: { nombre: 'asc' } }],
    });
  }

  async addMember(organizacionId: string, organizacionEmpresaId: string, usuarioId: string, dto: AddMiembroDto) {
    const current = await this.assertAdmin(organizacionId, usuarioId);
    const relation = await this.getRelation(organizacionId, organizacionEmpresaId);
    if (dto.rol === RolOrganizacion.OWNER || (dto.rol === RolOrganizacion.ADMIN_ORGANIZACION && current.rol !== RolOrganizacion.OWNER)) {
      throw new ForbiddenException('No puede asignar ese rol organizacional');
    }
    const target = await this.prisma.usuario.findUnique({ where: { email: dto.email.toLowerCase() }, select: { id: true } });
    if (!target) throw new NotFoundException('El usuario debe existir antes de ser incorporado');

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.organizacionMiembro.upsert({
        where: { organizacionId_usuarioId: { organizacionId, usuarioId: target.id } },
        create: { id: randomUUID(), organizacionId, usuarioId: target.id, rol: dto.rol, activa: true },
        update: { rol: dto.rol, activa: true },
      });
      await tx.accesoEmpresa.upsert({
        where: { organizacionEmpresaId_organizacionMiembroId: { organizacionEmpresaId, organizacionMiembroId: member.id } },
        create: {
          id: randomUUID(), organizacionEmpresaId, organizacionMiembroId: member.id,
          organizacionId, empresaId: relation.empresaId, rol: dto.rolOperativo || Rol.TECNICO, activo: true,
        },
        update: { rol: dto.rolOperativo || Rol.TECNICO, activo: true },
      });
      return member;
    });
  }

  async updateMember(organizacionId: string, usuarioId: string, memberId: string, dto: UpdateMiembroDto) {
    const current = await this.assertAdmin(organizacionId, usuarioId);
    const target = await this.prisma.organizacionMiembro.findFirst({ where: { id: memberId, organizacionId } });
    if (!target) throw new NotFoundException('Membresía no encontrada');
    if (target.usuarioId === usuarioId) throw new BadRequestException('No puede modificar su propia membresía');
    if (dto.rol === RolOrganizacion.OWNER || (dto.rol === RolOrganizacion.ADMIN_ORGANIZACION && current.rol !== RolOrganizacion.OWNER)) {
      throw new ForbiddenException('No puede asignar ese rol organizacional');
    }
    return this.prisma.organizacionMiembro.update({ where: { id: memberId }, data: dto });
  }

  async revokeMember(organizacionId: string, usuarioId: string, memberId: string) {
    await this.assertAdmin(organizacionId, usuarioId);
    const target = await this.prisma.organizacionMiembro.findFirst({ where: { id: memberId, organizacionId } });
    if (!target) throw new NotFoundException('Membresía no encontrada');
    if (target.usuarioId === usuarioId) throw new BadRequestException('No puede revocar su propia membresía');
    await this.prisma.$transaction([
      this.prisma.organizacionMiembro.update({ where: { id: memberId }, data: { activa: false } }),
      this.prisma.accesoEmpresa.updateMany({ where: { organizacionMiembroId: memberId, organizacionId }, data: { activo: false } }),
    ]);
    return { message: 'Membresía revocada' };
  }

  async listCompanies(organizacionId: string, usuarioId: string) {
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.organizacionEmpresa.findMany({
      where: { organizacionId },
      select: { id: true, estado: true, empresa: { include: { _count: { select: { usuarios: true, inspecciones: true, establecimientos: true } } } } },
      orderBy: { empresa: { nombre: 'asc' } },
    });
  }

  async createCompany(organizacionId: string, organizacionMiembroId: string, usuarioId: string, dto: CreateEmpresaClienteDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({ data: dto });
      const relation = await tx.organizacionEmpresa.create({ data: { id: randomUUID(), organizacionId, empresaId: empresa.id } });
      await tx.accesoEmpresa.create({
        data: { id: randomUUID(), organizacionEmpresaId: relation.id, organizacionMiembroId, organizacionId, empresaId: empresa.id, rol: Rol.ADMIN_EMPRESA, activo: true },
      });
      return relation;
    });
  }

  async linkCompany(organizacionId: string, organizacionMiembroId: string, usuarioId: string, dto: LinkEmpresaDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    const empresa = await this.prisma.empresa.findUnique({ where: { id: dto.empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');
    const relation = await this.prisma.organizacionEmpresa.upsert({
      where: { organizacionId_empresaId: { organizacionId, empresaId: dto.empresaId } },
      create: { id: randomUUID(), organizacionId, empresaId: dto.empresaId },
      update: { estado: EstadoRelacionEmpresa.ACTIVA },
    });
    await this.prisma.accesoEmpresa.upsert({
      where: { organizacionEmpresaId_organizacionMiembroId: { organizacionEmpresaId: relation.id, organizacionMiembroId } },
      create: { id: randomUUID(), organizacionEmpresaId: relation.id, organizacionMiembroId, organizacionId, empresaId: dto.empresaId, rol: Rol.ADMIN_EMPRESA, activo: true },
      update: { activo: true, rol: Rol.ADMIN_EMPRESA },
    });
    return relation;
  }

  async updateCompanyRelation(organizacionId: string, usuarioId: string, id: string, dto: UpdateEmpresaRelationDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    await this.getRelation(organizacionId, id, false);
    return this.prisma.organizacionEmpresa.update({ where: { id }, data: { estado: dto.estado } });
  }

  async updateCompany(organizacionId: string, usuarioId: string, relationId: string, dto: UpdateEmpresaClienteDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    const relation = await this.getRelation(organizacionId, relationId, false);
    return this.prisma.empresa.update({ where: { id: relation.empresaId }, data: dto });
  }

  async listEstablishments(organizacionId: string, usuarioId: string, relationId: string) {
    const relation = await this.getRelation(organizacionId, relationId);
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.establecimiento.findMany({ where: { empresaId: relation.empresaId }, orderBy: { nombre: 'asc' } });
  }

  async createEstablishment(organizacionId: string, usuarioId: string, relationId: string, dto: CreateEstablecimientoDto) {
    const relation = await this.getRelation(organizacionId, relationId);
    await this.assertAdmin(organizacionId, usuarioId);
    return this.prisma.establecimiento.create({ data: { ...dto, empresaId: relation.empresaId } });
  }

  async updateEstablishment(organizacionId: string, usuarioId: string, relationId: string, id: string, dto: UpdateEstablecimientoDto) {
    const relation = await this.getRelation(organizacionId, relationId);
    await this.assertAdmin(organizacionId, usuarioId);
    const establishment = await this.prisma.establecimiento.findFirst({ where: { id, empresaId: relation.empresaId } });
    if (!establishment) throw new NotFoundException('Establecimiento no encontrado');
    return this.prisma.establecimiento.update({ where: { id }, data: dto });
  }

  async listAssignments(organizacionId: string, usuarioId: string, relationId: string) {
    await this.assertAdmin(organizacionId, usuarioId);
    await this.getRelation(organizacionId, relationId);
    return this.prisma.accesoEmpresa.findMany({
      where: { organizacionEmpresaId: relationId },
      select: { id: true, rol: true, activo: true, organizacionMiembroId: true,
        organizacionMiembro: { select: { usuario: { select: { id: true, email: true, nombre: true, apellido: true } }, rol: true, activa: true } } },
      orderBy: { organizacionMiembro: { usuario: { nombre: 'asc' } } },
    });
  }

  async assignAccess(organizacionId: string, usuarioId: string, relationId: string, dto: AssignAccessDto) {
    await this.assertAdmin(organizacionId, usuarioId);
    const relation = await this.getRelation(organizacionId, relationId);
    const member = await this.prisma.organizacionMiembro.findFirst({ where: { id: dto.organizacionMiembroId, organizacionId, activa: true } });
    if (!member) throw new NotFoundException('Membresía no encontrada');
    return this.prisma.accesoEmpresa.upsert({
      where: { organizacionEmpresaId_organizacionMiembroId: { organizacionEmpresaId: relation.id, organizacionMiembroId: member.id } },
      create: { id: randomUUID(), organizacionEmpresaId: relation.id, organizacionMiembroId: member.id, organizacionId, empresaId: relation.empresaId, rol: dto.rol, activo: true },
      update: { rol: dto.rol, activo: true },
    });
  }

  async revokeAccess(organizacionId: string, usuarioId: string, relationId: string, accessId: string) {
    await this.assertAdmin(organizacionId, usuarioId);
    await this.getRelation(organizacionId, relationId);
    const access = await this.prisma.accesoEmpresa.findFirst({ where: { id: accessId, organizacionEmpresaId: relationId } });
    if (!access) throw new NotFoundException('Asignación no encontrada');
    await this.prisma.accesoEmpresa.update({ where: { id: accessId }, data: { activo: false } });
    return { message: 'Acceso revocado' };
  }
}
