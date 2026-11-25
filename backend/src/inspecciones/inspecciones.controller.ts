import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InspeccionesService } from './inspecciones.service';
import {
  CreateInspeccionDto,
  RegistrarItemDto,
  RegistrarMultiplesItemsDto,
  UpdateInspeccionDto,
  FinalizarInspeccionDto,
  ReasignarInspeccionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol, EstadoInspeccion } from '@prisma/client';

@ApiTags('inspecciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspecciones')
export class InspeccionesController {
  constructor(private readonly inspeccionesService: InspeccionesService) {}

  @Get()
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR, Rol.TECNICO)
  @ApiOperation({ summary: 'Listar todas las inspecciones de la empresa' })
  @ApiQuery({ name: 'estado', enum: EstadoInspeccion, required: false })
  @ApiQuery({ name: 'usuarioId', required: false })
  @ApiQuery({ name: 'asignadoAId', required: false })
  @ApiQuery({ name: 'checklistId', required: false })
  @ApiQuery({ name: 'sector', required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiQuery({ name: 'establecimientoId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de inspecciones' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @Query('estado') estado?: EstadoInspeccion,
    @Query('usuarioId') usuarioId?: string,
    @Query('asignadoAId') asignadoAId?: string,
    @Query('checklistId') checklistId?: string,
    @Query('sector') sector?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('establecimientoId') establecimientoId?: string,
  ) {
    return this.inspeccionesService.findAll(empresaId, {
      estado,
      usuarioId,
      asignadoAId: currentUserRole === Rol.TECNICO ? currentUserId : asignadoAId,
      checklistId,
      sector,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      establecimientoId,
    }, organizacionEmpresaId, currentUserRole, currentUserId, accesoEmpresaId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar mis inspecciones' })
  @ApiQuery({ name: 'estado', enum: EstadoInspeccion, required: false })
  @ApiResponse({ status: 200, description: 'Mis inspecciones' })
  async findMine(
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @Query('estado') estado?: EstadoInspeccion,
    @Query('establecimientoId') establecimientoId?: string,
  ) {
    return this.inspeccionesService.findMine(usuarioId, empresaId, { estado, establecimientoId }, organizacionEmpresaId, accesoEmpresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inspección por ID' })
  @ApiResponse({ status: 200, description: 'Inspección encontrada' })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.findOne(id, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, currentUserRole, accesoEmpresaId);
  }

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Obtener resumen de inspección' })
  @ApiResponse({ status: 200, description: 'Resumen de inspección' })
  async getResumen(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.getResumen(id, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, currentUserRole, accesoEmpresaId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva inspección' })
  @ApiResponse({ status: 201, description: 'Inspección creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async create(
    @Body() createInspeccionDto: CreateInspeccionDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @CurrentUser('organizacionId') organizacionId: string,
  ) {
    return this.inspeccionesService.create(createInspeccionDto, usuarioId, empresaId, organizacionEmpresaId, currentUserRole, accesoEmpresaId, organizacionId);
  }

  @Post(':id/iniciar')
  @ApiOperation({ summary: 'Iniciar inspección pendiente' })
  async iniciar(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.iniciar(id, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Post(':id/reasignar')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Reasignar inspección pendiente' })
  async reasignar(
    @Param('id') id: string,
    @Body() dto: ReasignarInspeccionDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.reasignar(id, dto, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar inspección' })
  @ApiResponse({ status: 200, description: 'Inspección actualizada' })
  async update(
    @Param('id') id: string,
    @Body() updateInspeccionDto: UpdateInspeccionDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.update(id, updateInspeccionDto, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, currentUserRole, accesoEmpresaId);
  }

  @Patch(':id/item')
  @ApiOperation({ summary: 'Registrar cumplimiento de un item' })
  @ApiResponse({ status: 200, description: 'Item actualizado' })
  async registrarItem(
    @Param('id') id: string,
    @Body() registrarItemDto: RegistrarItemDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.registrarItem(id, registrarItemDto, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Patch(':id/items')
  @ApiOperation({ summary: 'Registrar múltiples items de una vez' })
  @ApiResponse({ status: 200, description: 'Items actualizados' })
  async registrarMultiplesItems(
    @Param('id') id: string,
    @Body() registrarDto: RegistrarMultiplesItemsDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.registrarMultiplesItems(id, registrarDto.items, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Post(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar inspección' })
  @ApiResponse({ status: 200, description: 'Inspección finalizada' })
  @ApiResponse({ status: 400, description: 'Inspección ya finalizada' })
  async finalizar(
    @Param('id') id: string,
    @Body() finalizarDto: FinalizarInspeccionDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.finalizar(id, finalizarDto, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar inspección' })
  @ApiResponse({ status: 200, description: 'Inspección cancelada' })
  async cancelar(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.inspeccionesService.cancelar(id, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, currentUserRole, accesoEmpresaId);
  }
}

