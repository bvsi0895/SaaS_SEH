import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NivelRiesgo } from '@prisma/client';

export class CreateHallazgoDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID de la inspección',
  })
  @IsUUID('4')
  inspeccionId: string;

  @ApiProperty({
    example: 'Piso mojado sin señalizar',
    description: 'Título del hallazgo',
  })
  @IsString()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  titulo: string;

  @ApiProperty({
    example: 'Se detectó piso mojado en el área de producción sin la señalización correspondiente',
    description: 'Descripción detallada del hallazgo',
  })
  @IsString()
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  descripcion: string;

  @ApiProperty({
    enum: NivelRiesgo,
    example: NivelRiesgo.ALTO,
    description: 'Nivel de riesgo del hallazgo',
  })
  @IsEnum(NivelRiesgo, {
    message: `El nivel de riesgo debe ser uno de: ${Object.values(NivelRiesgo).join(', ')}`,
  })
  nivelRiesgo: NivelRiesgo;

  @ApiProperty({
    example: 'Sector B, cerca de la línea 2',
    description: 'Ubicación específica del hallazgo',
  })
  @IsString()
  @MinLength(3)
  ubicacionTexto: string;

  @ApiPropertyOptional({
    example: ['https://storage.com/foto1.jpg', 'https://storage.com/foto2.jpg'],
    description: 'URLs de las fotos del hallazgo',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosUrls?: string[];
}
