import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '@prisma/client';

export class UsuarioResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'usuario@empresa.com' })
  email: string;

  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  apellido: string;

  @ApiProperty({ enum: Rol, example: 'TECNICO' })
  rol: Rol;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  empresaId: string;

  @ApiProperty({ example: true })
  activo: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de acceso JWT',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresco JWT',
  })
  refreshToken: string;

  @ApiProperty({
    type: UsuarioResponseDto,
    description: 'Datos del usuario autenticado',
  })
  usuario: UsuarioResponseDto;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de refresco',
  })
  refreshToken: string;
}
