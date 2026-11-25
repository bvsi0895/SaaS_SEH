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
import { TipoChecklist } from '@prisma/client';

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar biblioteca de checklists de la consultora' })
  @ApiQuery({ name: 'tipo', enum: TipoChecklist, required: false })
  @ApiQuery({ name: 'activo', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Lista de checklists' })
  async findAll(
    @CurrentUser('organizacionId') organizacionId: string,
    @Query('tipo') tipo?: TipoChecklist,
    @Query('activo') activo?: boolean,
  ) {
    return this.checklistsService.findAll(organizacionId, { tipo, activo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener checklist por ID' })
  @ApiResponse({ status: 200, description: 'Checklist encontrado' })
  @ApiResponse({ status: 404, description: 'Checklist no encontrado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizacionId') organizacionId: string,
  ) {
    return this.checklistsService.findOne(id, organizacionId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo checklist' })
  @ApiResponse({ status: 201, description: 'Checklist creado' })
  async create(
    @Body() createChecklistDto: CreateChecklistDto,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.create(organizacionId, usuarioId, createChecklistDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist actualizado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChecklistDto: UpdateChecklistDto,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.update(id, updateChecklistDto, organizacionId, usuarioId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar item a checklist' })
  @ApiResponse({ status: 201, description: 'Item agregado' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createItemDto: CreateChecklistItemDto,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.addItem(id, createItemDto, organizacionId, usuarioId);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Actualizar item de checklist' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateItemDto: UpdateChecklistItemDto,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.updateItem(itemId, updateItemDto, organizacionId, usuarioId);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item de checklist' })
  @ApiResponse({ status: 200, description: 'Item eliminado' })
  @ApiResponse({ status: 400, description: 'Item ya usado en inspecciones' })
  async removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.removeItem(itemId, organizacionId, usuarioId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar checklist' })
  @ApiResponse({ status: 201, description: 'Checklist duplicado' })
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.duplicate(id, organizacionId, usuarioId);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist desactivado' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.deactivate(id, organizacionId, usuarioId);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar checklist' })
  @ApiResponse({ status: 200, description: 'Checklist reactivado' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.activate(id, organizacionId, usuarioId);
  }

  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reordenar items del checklist' })
  @ApiResponse({ status: 200, description: 'Items reordenados' })
  async reorderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() itemOrders: { id: string; orden: number }[],
    @CurrentUser('organizacionId') organizacionId: string,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.checklistsService.reorderItems(id, itemOrders, organizacionId, usuarioId);
  }
}
