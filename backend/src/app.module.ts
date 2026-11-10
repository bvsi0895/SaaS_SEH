import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { InspeccionesModule } from './inspecciones/inspecciones.module';
import { HallazgosModule } from './hallazgos/hallazgos.module';
import { AccionesCorrectivasModule } from './acciones-correctivas/acciones-correctivas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportesModule } from './reportes/reportes.module';
import { TenancyModule } from './tenancy/tenancy.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting (protección contra ataques de fuerza bruta)
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    }]),

    // Módulos de la aplicación
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    ChecklistsModule,
    InspeccionesModule,
    HallazgosModule,
    AccionesCorrectivasModule,
    DashboardModule,
    ReportesModule,
    TenancyModule,
  ],
})
export class AppModule {}
