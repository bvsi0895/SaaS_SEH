import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AllowCommercialRecovery } from './commercial-access.decorator';
import { SaasCommercialService } from './saas-commercial.service';
import { SaasAdminGuard } from './saas-admin.guard';
import { ActivateSubscriptionDto, StartTrialDto, SubscriptionReasonDto } from './dto';

@ApiTags('saas-control-plane')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saas')
export class SaasController {
  constructor(private readonly commercial: SaasCommercialService) {}

  @Get('cuenta/estado')
  @AllowCommercialRecovery()
  getOwnStatus(@CurrentUser('organizacionId') organizacionId: string) {
    return this.commercial.getOrganizationStatus(organizacionId);
  }
}

@ApiTags('saas-admin')
@ApiBearerAuth()
@UseGuards(SaasAdminGuard)
@Controller('saas/admin')
export class SaasAdminController {
  constructor(private readonly commercial: SaasCommercialService) {}

  @Get('planes')
  listPlans() { return this.commercial.listPlans(); }

  @Get('organizaciones')
  listOrganizations() { return this.commercial.listOrganizations(); }

  @Get('organizaciones/:id')
  getOrganization(@Param('id', ParseUUIDPipe) id: string) { return this.commercial.getOrganizationStatus(id); }

  @Get('organizaciones/:id/auditoria')
  listAudit(@Param('id', ParseUUIDPipe) id: string) { return this.commercial.listAudit(id); }

  @Post('organizaciones/:id/prueba')
  startTrial(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @Body() dto: StartTrialDto) {
    return this.commercial.startTrial(id, actorId, dto.planId, dto.dias);
  }

  @Post('organizaciones/:id/activar')
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @Body() dto: ActivateSubscriptionDto) {
    return this.commercial.activate(id, actorId, dto.planId, dto.finPeriodo ? new Date(dto.finPeriodo) : undefined);
  }

  @Post('organizaciones/:id/suspender')
  suspend(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @Body() dto: SubscriptionReasonDto) {
    return this.commercial.suspend(id, actorId, dto.motivo);
  }

  @Post('organizaciones/:id/cancelar')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') actorId: string, @Body() dto: SubscriptionReasonDto) {
    return this.commercial.cancel(id, actorId, dto.motivo);
  }
}

