import {
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@prisma/client';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  apellido?: string;

  @ApiPropertyOptional({
    enum: Rol,
    description: 'Rol del usuario en el sistema',
  })
  @IsOptional()
  @IsEnum(Rol, { message: 'El rol debe ser uno de: ADMIN_EMPRESA, SUPERVISOR, TECNICO' })
  rol?: Rol;

  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo del usuario',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'MiPasswordActual123!',
    description: 'Contraseña actual',
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiPropertyOptional({
    example: 'MiNuevoPassword123!',
    description: 'Nueva contraseña',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'La contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
  })
  newPassword: string;
}

export class AdminChangePasswordDto {
  @ApiPropertyOptional({
    example: 'MiNuevoPassword123!',
    description: 'Nueva contraseña definida por un administrador de la misma empresa',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'La contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
  })
  newPassword: string;
}
