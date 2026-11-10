import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Configuración global de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
      transform: true, // Transforma tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configurado desde variables de entorno
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('SEH API')
    .setDescription('API del Sistema de Seguridad e Higiene')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y autorización')
    .addTag('usuarios', 'Gestión de usuarios')
    .addTag('empresas', 'Gestión de empresas')
    .addTag('checklists', 'Gestión de checklists')
    .addTag('inspecciones', 'Gestión de inspecciones')
    .addTag('hallazgos', 'Gestión de hallazgos')
    .addTag('acciones-correctivas', 'Gestión de acciones correctivas')
    .addTag('dashboard', 'Métricas y reportes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Puerto desde variable de entorno
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`
    🚀 Servidor SEH iniciado correctamente
    📡 API: http://localhost:${port}
    📚 Documentación: http://localhost:${port}/api/docs
    🌍 Entorno: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap();
