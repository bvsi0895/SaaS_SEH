import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoChecklist } from '@prisma/client';

export class CreateChecklistItemDto {
  @ApiProperty({
    example: 'Los pisos están limpios y secos',
    description: 'Descripción del item',
  })
  @IsString()
  @MinLength(5, { message: 'La descripción debe tener al menos 5 caracteres' })
  descripcion: string;

  @ApiProperty({
    example: 1,
    description: 'Orden del item en el checklist',
  })
  @IsInt()
  @Min(1)
  orden: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Si el item es obligatorio',
  })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;
}

export class CreateChecklistDto {
  @ApiProperty({
    example: 'Inspección de Orden y Limpieza',
    description: 'Nombre del checklist',
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombre: string;

  @ApiPropertyOptional({
    example: 'Checklist para verificar orden y limpieza en áreas de producción',
    description: 'Descripción del checklist',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    enum: TipoChecklist,
    default: TipoChecklist.GENERAL,
    description: 'Tipo de checklist',
  })
  @IsOptional()
  @IsEnum(TipoChecklist, {
    message: `El tipo debe ser uno de: ${Object.values(TipoChecklist).join(', ')}`,
  })
  tipo?: TipoChecklist;

  @ApiPropertyOptional({
    type: [CreateChecklistItemDto],
    description: 'Items del checklist',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  items?: CreateChecklistItemDto[];
}
