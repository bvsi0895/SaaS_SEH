import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  IsNumber,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInspeccionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del checklist a usar',
  })
  @IsUUID('4', { message: 'El ID de checklist debe ser un UUID válido' })
  checklistId: string;

  @ApiProperty({
    example: 'Línea de producción 2',
    description: 'Sector o área a inspeccionar',
  })
  @IsString()
  @MinLength(2, { message: 'El sector debe tener al menos 2 caracteres' })
  sector: string;

  @ApiPropertyOptional({
    example: 'Inspección mensual de orden y limpieza',
    description: 'Descripción adicional de la inspección',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'Nave 3, Sector B',
    description: 'Ubicación textual',
  })
  @IsOptional()
  @IsString()
  ubicacionTexto?: string;

  @ApiPropertyOptional({
    example: -34.6037,
    description: 'Latitud GPS',
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitud?: number;

  @ApiPropertyOptional({
    example: -58.3816,
    description: 'Longitud GPS',
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitud?: number;
}
