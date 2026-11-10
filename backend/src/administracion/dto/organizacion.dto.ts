import { IsEmail, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateOrganizacionDto {
  @IsOptional() @IsString() @MaxLength(160) nombre?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500) logoUrl?: string;
  @IsOptional() @IsEmail() @MaxLength(160) emailContacto?: string;
  @IsOptional() @IsString() @MaxLength(40) telefono?: string;
  @IsOptional() @IsString() @MaxLength(240) direccion?: string;
}
