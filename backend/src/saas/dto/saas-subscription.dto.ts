import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min, IsString, MaxLength } from 'class-validator';

export class StartTrialDto {
  @ApiPropertyOptional({ description: 'Plan UUID; por defecto DEMO_15_DIAS' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dias?: number;
}

export class ActivateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Plan UUID; conserva el actual si se omite' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento del período contratado' })
  @IsOptional()
  @IsDateString()
  finPeriodo?: string;
}

export class SubscriptionReasonDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}

