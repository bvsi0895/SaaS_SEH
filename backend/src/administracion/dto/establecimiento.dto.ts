import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEstablecimientoDto {
  @IsString() @MaxLength(160) nombre!: string;
  @IsOptional() @IsString() @MaxLength(60) codigo?: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
  @IsOptional() @IsString() @MaxLength(1000) sectores?: string;
}
export class UpdateEstablecimientoDto {
  @IsOptional() @IsString() @MaxLength(160) nombre?: string;
  @IsOptional() @IsString() @MaxLength(60) codigo?: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
  @IsOptional() @IsString() @MaxLength(1000) sectores?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
