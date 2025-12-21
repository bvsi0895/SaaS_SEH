import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio de Prisma que gestiona la conexión a la base de datos
 * Implementa hooks de ciclo de vida para conectar/desconectar correctamente
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Conexión a base de datos establecida');
    } catch (error) {
      this.logger.error('❌ Error conectando a la base de datos:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Conexión a base de datos cerrada');
  }

  /**
   * Limpia la base de datos (útil para testing)
   * ⚠️ SOLO USAR EN DESARROLLO/TESTING
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No se puede limpiar la base de datos en producción');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key !== 'constructor',
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      }),
    );
  }
}
