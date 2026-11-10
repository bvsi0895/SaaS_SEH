import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
} from './dto';
import { TipoChecklist } from '@prisma/client';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los checklists de una empresa
   */
  async findAll(empresaId: string, filters?: { tipo?: TipoChecklist; activo?: boolean }, organizacionEmpresaId?: string) {
    return this.prisma.checklist.findMany({
      where: {
        empresaId,
        ...(organizacionEmpresaId && { organizacionEmpresaId }),
        ...(filters?.tipo && { tipo: filters.tipo }),
        ...(filters?.activo !== undefined && { activo: filters.activo }),
      },
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
        _count: {
          select: { inspecciones: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Obtener checklist por ID
   */
  async findOne(id: string, empresaId?: string, organizacionEmpresaId?: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
        _count: {
          select: { inspecciones: true },
        },
      },
    });

    if (!checklist) {
      throw new NotFoundException('Checklist no encontrado');
    }

    if (empresaId && checklist.empresaId !== empresaId) {
      throw new NotFoundException('Checklist no encontrado');
    }
    if (organizacionEmpresaId && checklist.organizacionEmpresaId !== organizacionEmpresaId) {
      throw new NotFoundException('Checklist no encontrado');
    }

    return checklist;
  }

  /**
   * Crear nuevo checklist
   */
  async create(empresaId: string, createChecklistDto: CreateChecklistDto, organizacionEmpresaId?: string) {
    const { items, ...checklistData } = createChecklistDto;

    return this.prisma.checklist.create({
      data: {
        ...checklistData,
        empresaId,
        organizacionEmpresaId,
        items: items
          ? {
              create: items.map((item) => ({
                descripcion: item.descripcion,
                orden: item.orden,
                obligatorio: item.obligatorio ?? true,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  /**
   * Actualizar checklist
   */
  async update(id: string, updateChecklistDto: UpdateChecklistDto, empresaId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionEmpresaId);

    return this.prisma.checklist.update({
      where: { id },
      data: updateChecklistDto,
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  /**
   * Agregar item a checklist
   */
  async addItem(checklistId: string, createItemDto: CreateChecklistItemDto, empresaId?: string, organizacionEmpresaId?: string) {
    await this.findOne(checklistId, empresaId, organizacionEmpresaId);

    return this.prisma.checklistItem.create({
      data: {
        checklistId,
        descripcion: createItemDto.descripcion,
        orden: createItemDto.orden,
        obligatorio: createItemDto.obligatorio ?? true,
      },
    });
  }

  /**
   * Actualizar item de checklist
   */
  async updateItem(itemId: string, updateItemDto: UpdateChecklistItemDto, empresaId?: string, organizacionEmpresaId?: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { select: { empresaId: true, organizacionEmpresaId: true } } },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }
    if ((empresaId && item.checklist.empresaId !== empresaId) ||
      (organizacionEmpresaId && item.checklist.organizacionEmpresaId !== organizacionEmpresaId)) {
      throw new NotFoundException('Item no encontrado');
    }

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: updateItemDto,
    });
  }

  /**
   * Eliminar item de checklist
   */
  async removeItem(itemId: string, empresaId?: string, organizacionEmpresaId?: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        inspeccionItems: true,
        checklist: { select: { empresaId: true, organizacionEmpresaId: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }
    if ((empresaId && item.checklist.empresaId !== empresaId) ||
      (organizacionEmpresaId && item.checklist.organizacionEmpresaId !== organizacionEmpresaId)) {
      throw new NotFoundException('Item no encontrado');
    }

    // No eliminar si ya fue usado en inspecciones
    if (item.inspeccionItems.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el item porque ya fue usado en inspecciones',
      );
    }

    await this.prisma.checklistItem.delete({
      where: { id: itemId },
    });

    return { message: 'Item eliminado exitosamente' };
  }

  /**
   * Duplicar checklist
   */
  async duplicate(id: string, empresaId: string, organizacionEmpresaId?: string) {
    const original = await this.findOne(id, empresaId, organizacionEmpresaId);

    return this.prisma.checklist.create({
      data: {
        nombre: `${original.nombre} (copia)`,
        descripcion: original.descripcion,
        tipo: original.tipo,
        empresaId,
        organizacionEmpresaId,
        items: {
          create: original.items.map((item) => ({
            descripcion: item.descripcion,
            orden: item.orden,
            obligatorio: item.obligatorio,
          })),
        },
      },
      include: {
        items: {
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  /**
   * Desactivar checklist (soft delete)
   */
  async deactivate(id: string, empresaId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionEmpresaId);

    return this.prisma.checklist.update({
      where: { id },
      data: { activo: false },
    });
  }

  /**
   * Reactivar checklist
   */
  async activate(id: string, empresaId?: string, organizacionEmpresaId?: string) {
    await this.findOne(id, empresaId, organizacionEmpresaId);

    return this.prisma.checklist.update({
      where: { id },
      data: { activo: true },
    });
  }

  /**
   * Reordenar items de checklist
   */
  async reorderItems(checklistId: string, itemOrders: { id: string; orden: number }[], empresaId?: string, organizacionEmpresaId?: string) {
    await this.findOne(checklistId, empresaId, organizacionEmpresaId);
    const validItems = await this.prisma.checklistItem.count({
      where: {
        checklistId,
        id: { in: itemOrders.map((item) => item.id) },
      },
    });
    if (validItems !== itemOrders.length) {
      throw new NotFoundException('Item no encontrado');
    }
    const updates = itemOrders.map((item) =>
      this.prisma.checklistItem.update({
        where: { id: item.id },
        data: { orden: item.orden },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findOne(checklistId, empresaId, organizacionEmpresaId);
  }
}
