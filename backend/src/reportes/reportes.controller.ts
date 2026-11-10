import { Controller, Get, Param, Query, Res, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('inspecciones/:id/pdf')
  @ApiOperation({ summary: 'Generar PDF de una inspección' })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF de la inspección',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 404, description: 'Inspección no encontrada' })
  async getPDFInspeccion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.generarPDFInspeccion(id, empresaId, organizacionEmpresaId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="inspeccion-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get('inspecciones/:id/pdf/download')
  @ApiOperation({ summary: 'Descargar PDF de una inspección' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF descargado' })
  async downloadPDFInspeccion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.generarPDFInspeccion(id, empresaId, organizacionEmpresaId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="inspeccion-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get('inspecciones/consolidado')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Generar reporte consolidado de inspecciones' })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiResponse({ status: 200, description: 'Reporte consolidado' })
  async getReporteConsolidado(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.reportesService.generarReporteConsolidado(empresaId, {
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    }, organizacionEmpresaId);
  }

  @Get('mensual.pdf')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Generar informe mensual profesional en PDF' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'fechaDesde', required: true, description: 'Fecha inicial ISO-8601' })
  @ApiQuery({ name: 'fechaHasta', required: true, description: 'Fecha final ISO-8601' })
  @ApiQuery({ name: 'establecimientoId', required: false })
  @ApiResponse({ status: 200, description: 'Informe mensual PDF' })
  async getReporteMensualPDF(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @CurrentUser('accesoEmpresaId') accesoEmpresaId: string,
    @Query('fechaDesde') fechaDesde: string,
    @Query('fechaHasta') fechaHasta: string,
    @Query('establecimientoId') establecimientoId: string | undefined,
    @Res() res: Response,
  ) {
    const desde = new Date(fechaDesde);
    const hasta = new Date(fechaHasta);
    if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || desde > hasta) {
      res.status(400).json({ message: 'El período informado no es válido' });
      return;
    }
    const pdfBuffer = await this.reportesService.generarReporteMensualPDF({
      empresaId,
      organizacionEmpresaId,
      accesoEmpresaId,
      establecimientoId,
      fechaDesde: desde,
      fechaHasta: hasta,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="informe-mensual-${fechaDesde.slice(0, 10)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('hallazgos')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Generar reporte de hallazgos' })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiQuery({ name: 'nivelRiesgo', required: false })
  @ApiResponse({ status: 200, description: 'Reporte de hallazgos' })
  async getReporteHallazgos(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('nivelRiesgo') nivelRiesgo?: string,
  ) {
    return this.reportesService.generarReporteHallazgos(empresaId, {
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      nivelRiesgo,
    }, organizacionEmpresaId);
  }

  @Get('acciones-correctivas')
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Generar reporte de acciones correctivas' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'responsableId', required: false })
  @ApiResponse({ status: 200, description: 'Reporte de acciones correctivas' })
  async getReporteAcciones(
    @CurrentUser('empresaId') empresaId: string,
    @CurrentUser('organizacionEmpresaId') organizacionEmpresaId: string,
    @Query('estado') estado?: string,
    @Query('responsableId') responsableId?: string,
  ) {
    return this.reportesService.generarReporteAcciones(empresaId, {
      estado,
      responsableId,
    }, organizacionEmpresaId);
  }
}
