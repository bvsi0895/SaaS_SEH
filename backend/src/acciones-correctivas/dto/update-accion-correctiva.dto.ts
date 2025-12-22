import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoAccion } from '@prisma/client';

export class UpdateAccionCorrectivaDto {
  @ApiPropertyOptional({
    example: 'Instalar señalización y capacitar personal',
    description: 'Descripción de la acción',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  descripcion?: string;

  @ApiPropertyOptional({
    example: '2025-02-15',
    description: 'Fecha compromiso',
  })
  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del responsable',
  })
  @IsOptional()
  @IsUUID('4')
  responsableId?: string;

  @ApiPropertyOptional({
    example: 'Jefe de Mantenimiento',
    description: 'Responsable en texto',
  })
  @IsOptional()
  @IsString()
  responsableTexto?: string;

  @ApiPropertyOptional({
    enum: EstadoAccion,
    description: 'Estado de la acción',
  })
  @IsOptional()
  @IsEnum(EstadoAccion)
  estado?: EstadoAccion;
}

export class CerrarAccionDto {
  @ApiPropertyOptional({
    example: 'Se instaló la señalización y se capacitó al personal el día 10/02',
    description: 'Notas de cierre',
  })
  @IsOptional()
  @IsString()
  notasCierre?: string;

  @ApiPropertyOptional({
    example: 'https://storage.com/evidencia.jpg',
    description: 'URL de la evidencia de cierre',
  })
  @IsOptional()
  @IsString()
  evidenciaUrl?: string;
}
