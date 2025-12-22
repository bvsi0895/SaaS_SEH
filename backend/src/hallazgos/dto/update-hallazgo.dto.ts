import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NivelRiesgo } from '@prisma/client';

export class UpdateHallazgoDto {
  @ApiPropertyOptional({
    example: 'Piso mojado sin señalizar',
    description: 'Título del hallazgo',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  titulo?: string;

  @ApiPropertyOptional({
    example: 'Descripción actualizada del hallazgo',
    description: 'Descripción detallada',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  descripcion?: string;

  @ApiPropertyOptional({
    enum: NivelRiesgo,
    description: 'Nivel de riesgo',
  })
  @IsOptional()
  @IsEnum(NivelRiesgo)
  nivelRiesgo?: NivelRiesgo;

  @ApiPropertyOptional({
    example: 'Sector B, cerca de la línea 2',
    description: 'Ubicación del hallazgo',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  ubicacionTexto?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs de fotos',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosUrls?: string[];
}
