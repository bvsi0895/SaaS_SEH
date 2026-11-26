import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
} from './dto';
import { RolOrganizacion, TipoChecklist } from '@prisma/client';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  private async assertLibraryAdmin(organizacionId: string, usuarioId: string) {
    const member = await this.prisma.organizacionMiembro.findFirst({
      where: {
        organizacionId,
        usuarioId,
        activa: true,
        organizacion: { activa: true },
      },
      select: { rol: true },
    });
    if (!member || (member.rol !== RolOrganizacion.OWNER && member.rol !== RolOrganizacion.ADMIN_ORGANIZACION)) {
      throw new ForbiddenException('Se requiere un rol administrador de la consultora');
    }
  }

  /** Obtener la biblioteca de checklists de la consultora del contexto autenticado. */
  async findAll(organizacionId: string, filters?: { tipo?: TipoChecklist; activo?: boolean }) {
    return this.prisma.checklist.findMany({
      where: {
        organizacionId,
        ...(filters?.tipo && { tipo: filters.tipo }),
        ...(filters?.activo !== undefined && { activo: filters.activo }),
      },
      include: {
        items: { orderBy: { orden: 'asc' } },
        _count: { select: { inspecciones: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Obtener un checklist sólo dentro de la biblioteca de la consultora. */
  async findOne(id: string, organizacionId: string) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id, organizacionId },
      include: {
        items: { orderBy: { orden: 'asc' } },
        _count: { select: { inspecciones: true } },
      },
    });

    if (!checklist) throw new NotFoundException('Checklist no encontrado');
    return checklist;
  }

  /** Crear un checklist en la biblioteca de la consultora autenticada. */
  async create(organizacionId: string, usuarioId: string, createChecklistDto: CreateChecklistDto) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    const { items, ...checklistData } = createChecklistDto;

    return this.prisma.checklist.create({
      data: {
        ...checklistData,
        organizacionId,
        items: items
          ? { create: items.map((item) => ({
              descripcion: item.descripcion,
              orden: item.orden,
              obligatorio: item.obligatorio ?? true,
            })) }
          : undefined,
      },
      include: { items: { orderBy: { orden: 'asc' } } },
    });
  }

  async update(id: string, updateChecklistDto: UpdateChecklistDto, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    await this.findOne(id, organizacionId);
    return this.prisma.checklist.update({
      where: { id },
      data: updateChecklistDto,
      include: { items: { orderBy: { orden: 'asc' } } },
    });
  }

  async addItem(checklistId: string, createItemDto: CreateChecklistItemDto, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    await this.findOne(checklistId, organizacionId);
    return this.prisma.checklistItem.create({
      data: {
        checklistId,
        descripcion: createItemDto.descripcion,
        orden: createItemDto.orden,
        obligatorio: createItemDto.obligatorio ?? true,
      },
    });
  }

  async updateItem(itemId: string, updateItemDto: UpdateChecklistItemDto, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, checklist: { organizacionId } },
      include: { inspeccionItems: { select: { id: true } } },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.inspeccionItems.length > 0) {
      throw new BadRequestException('No se puede modificar el item porque ya fue usado en inspecciones');
    }
    return this.prisma.checklistItem.update({ where: { id: itemId }, data: updateItemDto });
  }

  async removeItem(itemId: string, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, checklist: { organizacionId } },
      include: { inspeccionItems: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.inspeccionItems.length > 0) {
      throw new BadRequestException('No se puede eliminar el item porque ya fue usado en inspecciones');
    }
    await this.prisma.checklistItem.delete({ where: { id: itemId } });
    return { message: 'Item eliminado exitosamente' };
  }

  async duplicate(id: string, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    const original = await this.findOne(id, organizacionId);
    return this.prisma.checklist.create({
      data: {
        nombre: `${original.nombre} (copia)`,
        descripcion: original.descripcion,
        tipo: original.tipo,
        organizacionId,
        items: { create: original.items.map((item) => ({ descripcion: item.descripcion, orden: item.orden, obligatorio: item.obligatorio })) },
      },
      include: { items: { orderBy: { orden: 'asc' } } },
    });
  }

  async deactivate(id: string, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    await this.findOne(id, organizacionId);
    return this.prisma.checklist.update({ where: { id }, data: { activo: false } });
  }

  async activate(id: string, organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    await this.findOne(id, organizacionId);
    return this.prisma.checklist.update({ where: { id }, data: { activo: true } });
  }

  async reorderItems(checklistId: string, itemOrders: { id: string; orden: number }[], organizacionId: string, usuarioId: string) {
    await this.assertLibraryAdmin(organizacionId, usuarioId);
    await this.findOne(checklistId, organizacionId);
    const validItems = await this.prisma.checklistItem.count({
      where: { checklistId, id: { in: itemOrders.map((item) => item.id) } },
    });
    if (validItems !== itemOrders.length) throw new NotFoundException('Item no encontrado');
    await this.prisma.$transaction(itemOrders.map((item) => this.prisma.checklistItem.update({ where: { id: item.id }, data: { orden: item.orden } })));
    return this.findOne(checklistId, organizacionId);
  }
}
