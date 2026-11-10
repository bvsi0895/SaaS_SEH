import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto, UpdateEmpresaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Rol } from '@prisma/client';

@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Crear nueva empresa (registro inicial)' })
  @ApiResponse({ status: 201, description: 'Empresa creada' })
  @ApiResponse({ status: 409, description: 'CUIT ya registrado' })
  async create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresasService.create(createEmpresaDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi empresa' })
  @ApiResponse({ status: 200, description: 'Datos de la empresa' })
  async getMyEmpresa(@CurrentUser('empresaId') empresaId: string) {
    return this.empresasService.findOne(empresaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA)
  @Get('me/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estadísticas de mi empresa' })
  @ApiResponse({ status: 200, description: 'Estadísticas de la empresa' })
  async getMyEmpresaStats(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
  ) {
    return this.empresasService.getStats(empresaId, organizacionEmpresaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  @ApiResponse({ status: 200, description: 'Empresa encontrada' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    // Solo puede ver su propia empresa
    if (id !== empresaId) {
      return this.empresasService.findOne(empresaId);
    }
    return this.empresasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar empresa' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.empresasService.update(id, updateEmpresaDto, empresaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN_EMPRESA)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar mi empresa' })
  @ApiResponse({ status: 200, description: 'Empresa actualizada' })
  async updateMyEmpresa(
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.empresasService.update(empresaId, updateEmpresaDto);
  }
}
