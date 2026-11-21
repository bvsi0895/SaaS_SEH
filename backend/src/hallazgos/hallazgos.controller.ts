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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HallazgosService } from './hallazgos.service';
import { CreateHallazgoDto, ResolverHallazgoDto, UpdateHallazgoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { EstadoHallazgo, Rol, NivelRiesgo } from '@prisma/client';

@ApiTags('hallazgos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hallazgos')
export class HallazgosController {
  constructor(private readonly hallazgosService: HallazgosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar hallazgos de la empresa' })
  @ApiQuery({ name: 'nivelRiesgo', enum: NivelRiesgo, required: false })
  @ApiQuery({ name: 'estado', enum: EstadoHallazgo, required: false })
  @ApiQuery({ name: 'inspeccionId', required: false })
  @ApiQuery({ name: 'conAccionesCorrectivas', type: Boolean, required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiQuery({ name: 'establecimientoId', required: false })
  @ApiResponse({ status: 200, description: 'Lista de hallazgos' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @Query('nivelRiesgo') nivelRiesgo?: NivelRiesgo,
    @Query('estado') estado?: EstadoHallazgo,
    @Query('inspeccionId') inspeccionId?: string,
    @Query('conAccionesCorrectivas') conAccionesCorrectivas?: boolean,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('establecimientoId') establecimientoId?: string,
  ) {
    return this.hallazgosService.findAll(empresaId, {
      nivelRiesgo,
      estado,
      inspeccionId,
      conAccionesCorrectivas,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      establecimientoId,
    }, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }

  @Get('estadisticas')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener estadísticas de hallazgos' })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiResponse({ status: 200, description: 'Estadísticas de hallazgos' })
  async getEstadisticas(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.hallazgosService.getEstadisticas(
      empresaId,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
      organizacionEmpresaId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener hallazgo por ID' })
  @ApiResponse({ status: 200, description: 'Hallazgo encontrado' })
  @ApiResponse({ status: 404, description: 'Hallazgo no encontrado' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.findOne(id, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo hallazgo' })
  @ApiResponse({ status: 201, description: 'Hallazgo creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o inspección no en progreso' })
  async create(
    @Body() createHallazgoDto: CreateHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.create(createHallazgoDto, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }

  @Post(':id/fotos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
        const extension = /\.(jpe?g|png|webp)$/i.test(file.originalname);
        callback(null, allowed.has(file.mimetype) && extension);
      },
    }),
  )
  @ApiOperation({ summary: 'Subir fotografía de un hallazgo' })
  async uploadPhoto(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere una imagen JPG, PNG o WEBP');
    }
    return this.hallazgosService.addPhoto(id, empresaId, file, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }

  @Post(':id/resolver')
  @ApiOperation({ summary: 'Registrar una corrección inmediata y solucionar un hallazgo' })
  async resolver(
    @Param('id') id: string,
    @Body() dto: ResolverHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.resolver(id, dto, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Post(':id/verificar-resolucion')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR, Rol.TECNICO)
  @ApiOperation({ summary: 'Verificar una acción ejecutada y solucionar el hallazgo' })
  async verificarResolucion(
    @Param('id') id: string,
    @Body() dto: ResolverHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.verificarResolucion(id, dto, empresaId, organizacionEmpresaId, currentUserId, currentUserRole, accesoEmpresaId);
  }

  @Get(':id/fotos/:filename')
  @ApiOperation({ summary: 'Obtener fotografía autorizada de un hallazgo' })
  async getPhoto(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @Res() res: Response,
  ) {
    const photo = await this.hallazgosService.getPhoto(id, filename, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
    res.type(filename).send(photo);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar hallazgo' })
  @ApiResponse({ status: 200, description: 'Hallazgo actualizado' })
  @ApiResponse({ status: 400, description: 'Inspección finalizada' })
  async update(
    @Param('id') id: string,
    @Body() updateHallazgoDto: UpdateHallazgoDto,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.update(id, updateHallazgoDto, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar hallazgo' })
  @ApiResponse({ status: 200, description: 'Hallazgo eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('rol') currentUserRole: Rol,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
  ) {
    return this.hallazgosService.remove(id, empresaId, organizacionEmpresaId, currentUserRole === Rol.TECNICO ? currentUserId : undefined, accesoEmpresaId);
  }
}
