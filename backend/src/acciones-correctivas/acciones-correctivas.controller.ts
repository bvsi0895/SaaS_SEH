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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccionesCorrectivasService } from './acciones-correctivas.service';
import { CreateAccionCorrectivaDto, UpdateAccionCorrectivaDto, CerrarAccionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol, EstadoAccion } from '@prisma/client';

@ApiTags('acciones-correctivas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('acciones-correctivas')
export class AccionesCorrectivasController {
  constructor(private readonly accionesCorrectivasService: AccionesCorrectivasService) {}

  @Get()
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Listar acciones correctivas de la empresa' })
  @ApiQuery({ name: 'estado', enum: EstadoAccion, required: false })
  @ApiQuery({ name: 'responsableId', required: false })
  @ApiQuery({ name: 'hallazgoId', required: false })
  @ApiQuery({ name: 'vencidas', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Lista de acciones correctivas' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoAccion,
    @Query('responsableId') responsableId?: string,
    @Query('hallazgoId') hallazgoId?: string,
    @Query('vencidas') vencidas?: boolean,
  ) {
    return this.accionesCorrectivasService.findAll(empresaId, {
      estado,
      responsableId,
      hallazgoId,
      vencidas,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar mis acciones correctivas asignadas' })
  @ApiQuery({ name: 'estado', enum: EstadoAccion, required: false })
  @ApiResponse({ status: 200, description: 'Mis acciones correctivas' })
  async findMine(
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoAccion,
  ) {
    return this.accionesCorrectivasService.findMine(usuarioId, empresaId, { estado });
  }

  @Get('estadisticas')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener estadísticas de acciones correctivas' })
  @ApiResponse({ status: 200, description: 'Estadísticas' })
  async getEstadisticas(@CurrentUser('empresaId') empresaId: string) {
    return this.accionesCorrectivasService.getEstadisticas(empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener acción correctiva por ID' })
  @ApiResponse({ status: 200, description: 'Acción correctiva encontrada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.findOne(id, empresaId);
  }

  @Post()
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Crear acción correctiva' })
  @ApiResponse({ status: 201, description: 'Acción creada' })
  async create(
    @Body() createDto: CreateAccionCorrectivaDto,
    @CurrentUser('id') creadorId: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.create(createDto, creadorId, empresaId);
  }

  @Put(':id')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar acción correctiva' })
  @ApiResponse({ status: 200, description: 'Acción actualizada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAccionCorrectivaDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.update(id, updateDto, empresaId);
  }

  @Patch(':id/iniciar')
  @ApiOperation({ summary: 'Iniciar acción (cambiar a En Progreso)' })
  @ApiResponse({ status: 200, description: 'Acción iniciada' })
  async iniciar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.iniciar(id, empresaId);
  }

  @Post(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar acción correctiva' })
  @ApiResponse({ status: 200, description: 'Acción cerrada' })
  async cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cerrarDto: CerrarAccionDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.cerrar(id, cerrarDto, empresaId);
  }

  @Patch(':id/reabrir')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Reabrir acción correctiva cerrada' })
  @ApiResponse({ status: 200, description: 'Acción reabierta' })
  async reabrir(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.accionesCorrectivasService.reabrir(id, empresaId);
  }
}
