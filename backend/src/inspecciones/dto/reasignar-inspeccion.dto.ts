import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReasignarInspeccionDto {
  @ApiProperty({ description: 'Usuario técnico autorizado que recibirá la inspección' })
  @IsUUID('4')
  asignadoAId: string;
}

