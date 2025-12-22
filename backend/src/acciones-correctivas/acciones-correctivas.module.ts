import { Module } from '@nestjs/common';
import { AccionesCorrectivasController } from './acciones-correctivas.controller';
import { AccionesCorrectivasService } from './acciones-correctivas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccionesCorrectivasController],
  providers: [AccionesCorrectivasService],
  exports: [AccionesCorrectivasService],
})
export class AccionesCorrectivasModule {}
