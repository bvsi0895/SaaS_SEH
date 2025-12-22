import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CumplimientoItem } from '@prisma/client';

export class RegistrarItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del item de inspección',
  })
  @IsUUID('4')
  inspeccionItemId: string;

  @ApiProperty({
    enum: CumplimientoItem,
    example: CumplimientoItem.CUMPLE,
    description: 'Estado de cumplimiento del item',
  })
  @IsEnum(CumplimientoItem, {
    message: `El cumplimiento debe ser uno de: ${Object.values(CumplimientoItem).join(', ')}`,
  })
  cumplimiento: CumplimientoItem;

  @ApiPropertyOptional({
    example: 'Se observa limpieza adecuada',
    description: 'Observación sobre el item',
  })
  @IsOptional()
  @IsString()
  observacion?: string;
}

export class RegistrarMultiplesItemsDto {
  @ApiProperty({
    type: [RegistrarItemDto],
    description: 'Lista de items a registrar',
  })
  items: RegistrarItemDto[];
}
