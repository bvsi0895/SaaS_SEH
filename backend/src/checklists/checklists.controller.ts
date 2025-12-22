import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import {
  CreateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol, TipoChecklist } from '@prisma/client';

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar checklists de la empresa' })
  @ApiQuery({ name: 'tipo', enum: TipoChecklist, required: false })
  @ApiQuery({ name: 'activo', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Lista de checklists' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @Query('tipo') tipo?: TipoChecklist,
    @Query('activo') activo?: boolean,
  ) {
    return this.checklistsService.findAll(empresaId, { tipo, activo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener checklist por ID' })
  @ApiResponse({ status: 200, description: 'Checklist encontrado' })
  @ApiResponse({ status: 404, description: 'Checklist no encontrado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.findOne(id, empresaId);
  }

  @Post()
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Crear nuevo checklist' })
  @ApiResponse({ status: 201, description: 'Checklist creado' })
  async create(
    @Body() createChecklistDto: CreateChecklistDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.create(empresaId, createChecklistDto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Actualizar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist actualizado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChecklistDto: UpdateChecklistDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.update(id, updateChecklistDto, empresaId);
  }

  @Post(':id/items')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Agregar item a checklist' })
  @ApiResponse({ status: 201, description: 'Item agregado' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createItemDto: CreateChecklistItemDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.addItem(id, createItemDto, empresaId);
  }

  @Put('items/:itemId')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Actualizar item de checklist' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateItemDto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.updateItem(itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Eliminar item de checklist' })
  @ApiResponse({ status: 200, description: 'Item eliminado' })
  @ApiResponse({ status: 400, description: 'Item ya usado en inspecciones' })
  async removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.checklistsService.removeItem(itemId);
  }

  @Post(':id/duplicate')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Duplicar checklist' })
  @ApiResponse({ status: 201, description: 'Checklist duplicado' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.duplicate(id, empresaId);
  }

  @Patch(':id/deactivate')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Desactivar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist desactivado' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.deactivate(id, empresaId);
  }

  @Patch(':id/activate')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Reactivar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist reactivado' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.checklistsService.activate(id, empresaId);
  }

  @Patch(':id/reorder')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Reordenar items del checklist' })
  @ApiResponse({ status: 200, description: 'Items reordenados' })
  async reorderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() itemOrders: { id: string; orden: number }[],
  ) {
    return this.checklistsService.reorderItems(id, itemOrders);
  }
}
