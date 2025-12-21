import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global para el servicio de Prisma
 * Se marca como @Global() para que esté disponible en toda la aplicación
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
