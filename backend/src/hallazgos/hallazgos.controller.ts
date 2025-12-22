import {
  Controller,
  Get,
  Post,
  Put,
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
import { HallazgosService } from './hallazgos.service';
import { CreateHallazgoDto, UpdateHallazgoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol, NivelRiesgo } from '@prisma/client';

@ApiTags('hallazgos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar hallazgos de la empresa' })
  @ApiQuery({ name: 'nivelRiesgo', enum: NivelRiesgo, required: false })
  @ApiQuery({ name: 'inspeccionId', required: false })
  @ApiQuery({ name: 'conAccionesCorrectivas', type: Boolean, required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiResponse({ status: 200, description: 'Lista de hallazgos' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @Query('nivelRiesgo') nivelRiesgo?: NivelRiesgo,
    @Query('inspeccionId') inspeccionId?: string,
    @Query('conAccionesCorrectivas') conAccionesCorrectivas?: boolean,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.hallazgosService.findAll(empresaId, {
      nivelRiesgo,
      inspeccionId,
      conAccionesCorrectivas,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('estadisticas')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener estadísticas de hallazgos' })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiResponse({ status: 200, description: 'Estadísticas de hallazgos' })
  async getEstadisticas(
    @CurrentUser('empresaId') empresaId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.hallazgosService.getEstadisticas(
      empresaId,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener hallazgo por ID' })
  @ApiResponse({ status: 200, description: 'Hallazgo encontrado' })
  @ApiResponse({ status: 404, description: 'Hallazgo no encontrado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.hallazgosService.findOne(id, empresaId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo hallazgo' })
  @ApiResponse({ status: 201, description: 'Hallazgo creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o inspección no en progreso' })
  async create(
    @Body() createHallazgoDto: CreateHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.hallazgosService.create(createHallazgoDto, empresaId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar hallazgo' })
  @ApiResponse({ status: 200, description: 'Hallazgo actualizado' })
  @ApiResponse({ status: 400, description: 'Inspección finalizada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHallazgoDto: UpdateHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.hallazgosService.update(id, updateHallazgoDto, empresaId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar hallazgo' })
  @ApiResponse({ status: 200, description: 'Hallazgo eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.hallazgosService.remove(id, empresaId);
  }
}
