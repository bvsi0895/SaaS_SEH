import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener resumen general del dashboard' })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiResponse({ status: 200, description: 'Resumen del dashboard' })
  async getResumen(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.dashboardService.getResumen(empresaId, {
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    }, organizacionEmpresaId);
  }

  @Get('tendencias')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener tendencias por período' })
  @ApiQuery({ name: 'periodo', enum: ['semana', 'mes', 'trimestre'], required: false })
  @ApiResponse({ status: 200, description: 'Tendencias' })
  async getTendencias(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('periodo') periodo?: 'semana' | 'mes' | 'trimestre',
  ) {
    return this.dashboardService.getTendencias(empresaId, periodo, organizacionEmpresaId);
  }

  @Get('top-sectores')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener top sectores con más hallazgos' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Top sectores' })
  async getTopSectores(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getTopSectores(empresaId, limit || 5, organizacionEmpresaId);
  }

  @Get('actividad-reciente')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener actividad reciente' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Actividad reciente' })
  async getActividadReciente(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getActividadReciente(empresaId, limit || 10, organizacionEmpresaId);
  }

  @Get('kpis')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener KPIs principales' })
  @ApiResponse({ status: 200, description: 'KPIs' })
  async getKPIs(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
  ) {
    return this.dashboardService.getKPIs(empresaId, organizacionEmpresaId);
  }
}
