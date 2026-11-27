import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaasAdminGuard } from './saas-admin.guard';
import { SaasCommercialService } from './saas-commercial.service';
import { SaasAdminController, SaasController } from './saas.controller';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [SaasController, SaasAdminController],
  providers: [SaasCommercialService, SaasAdminGuard, JwtAuthGuard],
  exports: [SaasCommercialService, SaasAdminGuard],
})
export class SaasModule {}

