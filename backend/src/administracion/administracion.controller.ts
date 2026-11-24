import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdministracionService } from './administracion.service';
import { MAX_ORGANIZATION_LOGO_BYTES } from './logo.constants';
import {
  AddMiembroDto, AssignAccessDto, CreateEmpresaClienteDto, CreateEstablecimientoDto,
  LinkEmpresaDto, UpdateEmpresaRelationDto, UpdateEstablecimientoDto, UpdateMiembroDto,
  UpdateOrganizacionDto, UpdateEmpresaClienteDto,
} from './dto';

@ApiTags('administracion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizaciones')
export class AdministracionController {
  constructor(private readonly service: AdministracionService) {}

  @Get('me')
  getOrganization(@CurrentUser('organizacionId') orgId: string) { return this.service.getOrganization(orgId); }

  @Patch('me')
  updateOrganization(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateOrganizacionDto) {
    return this.service.updateOrganization(orgId, userId, dto);
  }

  @Post('me/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ORGANIZATION_LOGO_BYTES },
      fileFilter: (_request, file, callback) => {
        const allowedMime = new Set(['image/png', 'image/jpeg']);
        const allowedExtension = /\.(png|jpe?g)$/i.test(file.originalname);
        callback(null, allowedMime.has(file.mimetype) && allowedExtension);
      },
    }),
  )
  uploadLogo(
    @CurrentUser('organizacionId') orgId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    if (!file) throw new BadRequestException('Se requiere un logo PNG, JPG o JPEG de hasta 2 MiB');
    return this.service.uploadLogo(orgId, userId, file);
  }

  @Get('me/logo')
  async getLogo(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Res() res: Response) {
    const logo = await this.service.getLogo(orgId, userId);
    res.type(logo.contentType).send(logo.buffer);
  }

  @Delete('me/logo')
  deleteLogo(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string) {
    return this.service.deleteLogo(orgId, userId);
  }

  @Get('me/miembros')
  listMembers(@CurrentUser('organizacionId') orgId: string, @CurrentUser('organizacionEmpresaId') relationId: string, @CurrentUser('id') userId: string) {
    return this.service.listMembers(orgId, userId, relationId);
  }

  @Post('me/miembros')
  addMember(@CurrentUser('organizacionId') orgId: string, @CurrentUser('organizacionEmpresaId') relationId: string, @CurrentUser('id') userId: string, @Body() dto: AddMiembroDto) {
    return this.service.addMember(orgId, relationId, userId, dto);
  }

  @Patch('me/miembros/:memberId')
  updateMember(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('memberId', ParseUUIDPipe) memberId: string, @Body() dto: UpdateMiembroDto) {
    return this.service.updateMember(orgId, userId, memberId, dto);
  }

  @Post('me/miembros/:memberId/revocar')
  revokeMember(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.service.revokeMember(orgId, userId, memberId);
  }

  @Get('me/empresas')
  listCompanies(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string) {
    return this.service.listCompanies(orgId, userId);
  }

  @Post('me/empresas')
  createCompany(@CurrentUser('organizacionId') orgId: string, @CurrentUser('organizacionMiembroId') memberId: string, @CurrentUser('id') userId: string, @Body() dto: CreateEmpresaClienteDto) {
    return this.service.createCompany(orgId, memberId, userId, dto);
  }

  @Post('me/empresas/vincular')
  linkCompany(@CurrentUser('organizacionId') orgId: string, @CurrentUser('organizacionMiembroId') memberId: string, @CurrentUser('id') userId: string, @Body() dto: LinkEmpresaDto) {
    return this.service.linkCompany(orgId, memberId, userId, dto);
  }

  @Patch('me/empresas/:relationId')
  updateCompanyRelation(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Body() dto: UpdateEmpresaRelationDto) {
    return this.service.updateCompanyRelation(orgId, userId, relationId, dto);
  }

  @Patch('me/empresas/:relationId/datos')
  updateCompany(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Body() dto: UpdateEmpresaClienteDto) {
    return this.service.updateCompany(orgId, userId, relationId, dto);
  }

  @Get('me/empresas/:relationId/establecimientos')
  listEstablishments(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string) {
    return this.service.listEstablishments(orgId, userId, relationId);
  }

  @Post('me/empresas/:relationId/establecimientos')
  createEstablishment(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Body() dto: CreateEstablecimientoDto) {
    return this.service.createEstablishment(orgId, userId, relationId, dto);
  }

  @Patch('me/empresas/:relationId/establecimientos/:id')
  updateEstablishment(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstablecimientoDto) {
    return this.service.updateEstablishment(orgId, userId, relationId, id, dto);
  }

  @Get('me/empresas/:relationId/asignaciones')
  listAssignments(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string) {
    return this.service.listAssignments(orgId, userId, relationId);
  }

  @Post('me/empresas/:relationId/asignaciones')
  assignAccess(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Body() dto: AssignAccessDto) {
    return this.service.assignAccess(orgId, userId, relationId, dto);
  }

  @Post('me/empresas/:relationId/asignaciones/:accessId/revocar')
  revokeAccess(@CurrentUser('organizacionId') orgId: string, @CurrentUser('id') userId: string, @Param('relationId', ParseUUIDPipe) relationId: string, @Param('accessId', ParseUUIDPipe) accessId: string) {
    return this.service.revokeAccess(orgId, userId, relationId, accessId);
  }
}
