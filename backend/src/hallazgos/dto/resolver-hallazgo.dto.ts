import { IsArray, IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolverHallazgoDto {
  @ApiProperty({ description: 'Descripción de la solución o intervención verificada' })
  @IsString()
  @MinLength(10)
  descripcionSolucion: string;

  @ApiProperty({ description: 'Fecha y hora en que se realizó o verificó la solución' })
  @IsDateString()
  fechaResolucion: string;

  @ApiPropertyOptional({ description: 'Usuario o tercero responsable de la solución' })
  @IsOptional()
  @IsUUID('4')
  responsableId?: string;

  @ApiPropertyOptional({ description: 'Responsable que no pertenece al directorio de usuarios' })
  @IsOptional()
  @IsString()
  responsableTexto?: string;

  @ApiPropertyOptional({ type: [String], description: 'URLs de evidencias ya autorizadas' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenciaUrls?: string[];

  @ApiPropertyOptional({ description: 'Acción correctiva que fue ejecutada y verificada' })
  @IsOptional()
  @IsUUID('4')
  accionCorrectivaId?: string;
}
