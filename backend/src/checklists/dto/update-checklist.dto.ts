import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoChecklist } from '@prisma/client';

export class UpdateChecklistDto {
  @ApiPropertyOptional({
    example: 'Inspección de Orden y Limpieza',
    description: 'Nombre del checklist',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    example: 'Checklist para verificar orden y limpieza',
    description: 'Descripción del checklist',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    enum: TipoChecklist,
    description: 'Tipo de checklist',
  })
  @IsOptional()
  @IsEnum(TipoChecklist)
  tipo?: TipoChecklist;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo del checklist',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({
    example: 'Los pisos están limpios y secos',
    description: 'Descripción del item',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  descripcion?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden del item',
  })
  @IsOptional()
  orden?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el item es obligatorio',
  })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;
}
