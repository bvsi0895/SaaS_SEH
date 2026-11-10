import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EstadoRelacionEmpresa } from '@prisma/client';

export class CreateEmpresaClienteDto {
  @IsString() @MaxLength(160) nombre!: string;
  @IsOptional() @IsString() @MaxLength(20) cuit?: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
}
export class UpdateEmpresaClienteDto {
  @IsOptional() @IsString() @MaxLength(160) nombre?: string;
  @IsOptional() @IsString() @MaxLength(20) cuit?: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
}
export class LinkEmpresaDto { @IsUUID() empresaId!: string; }
export class UpdateEmpresaRelationDto { @IsEnum(EstadoRelacionEmpresa) estado!: EstadoRelacionEmpresa; }
