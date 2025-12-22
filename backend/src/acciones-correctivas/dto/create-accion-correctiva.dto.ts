import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccionCorrectivaDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del hallazgo',
  })
  @IsUUID('4')
  hallazgoId: string;

  @ApiProperty({
    example: 'Instalar señalización de piso mojado y capacitar al personal de limpieza',
    description: 'Descripción de la acción correctiva',
  })
  @IsString()
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  descripcion: string;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Fecha compromiso para resolver la acción',
  })
  @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaCompromiso: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario responsable',
  })
  @IsOptional()
  @IsUUID('4')
  responsableId?: string;

  @ApiPropertyOptional({
    example: 'Jefe de Mantenimiento',
    description: 'Responsable en texto libre (si no es usuario del sistema)',
  })
  @IsOptional()
  @IsString()
  responsableTexto?: string;
}
