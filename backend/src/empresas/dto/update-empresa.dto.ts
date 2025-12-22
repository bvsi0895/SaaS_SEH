import { IsString, IsOptional, MinLength, Matches, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmpresaDto {
  @ApiPropertyOptional({
    example: 'Industrias ABC S.A.',
    description: 'Nombre de la empresa',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    example: '20-12345678-9',
    description: 'CUIT de la empresa',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}-\d{8}-\d$/, {
    message: 'El CUIT debe tener el formato XX-XXXXXXXX-X',
  })
  cuit?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'URL del logo de la empresa',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo de la empresa',
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
