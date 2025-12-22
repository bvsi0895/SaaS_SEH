import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoInspeccion } from '@prisma/client';

export class UpdateInspeccionDto {
  @ApiPropertyOptional({
    example: 'Línea de producción 2',
    description: 'Sector o área',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  sector?: string;

  @ApiPropertyOptional({
    example: 'Inspección mensual actualizada',
    description: 'Descripción',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'Observaciones generales de la inspección',
    description: 'Observaciones finales',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class FinalizarInspeccionDto {
  @ApiPropertyOptional({
    example: 'Inspección completada sin novedades graves',
    description: 'Observaciones finales de la inspección',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
