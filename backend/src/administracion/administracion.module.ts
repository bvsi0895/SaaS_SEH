import { Module } from '@nestjs/common';
import { AdministracionController } from './administracion.controller';
import { AdministracionService } from './administracion.service';
import { SaasModule } from '../saas/saas.module';

@Module({ imports: [SaasModule], controllers: [AdministracionController], providers: [AdministracionService] })
export class AdministracionModule {}

