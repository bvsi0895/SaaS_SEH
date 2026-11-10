import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyService } from './tenancy.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
