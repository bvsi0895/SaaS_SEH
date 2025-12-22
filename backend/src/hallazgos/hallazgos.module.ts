import { Module } from '@nestjs/common';
import { HallazgosController } from './hallazgos.controller';
import { HallazgosService } from './hallazgos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HallazgosController],
  providers: [HallazgosService],
  exports: [HallazgosService],
})
export class HallazgosModule {}
