import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Rol, RolOrganizacion } from '@prisma/client';

export class AddMiembroDto {
  @IsEmail() email!: string;
  @IsEnum(RolOrganizacion) rol!: RolOrganizacion;
  @IsOptional() @IsEnum(Rol) rolOperativo?: Rol;
}
export class UpdateMiembroDto { @IsOptional() @IsEnum(RolOrganizacion) rol?: RolOrganizacion; }
export class AssignAccessDto {
  @IsUUID() organizacionMiembroId!: string;
  @IsEnum(Rol) rol!: Rol;
}
