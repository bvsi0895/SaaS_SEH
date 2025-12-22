import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Rol.ADMIN_EMPRESA, Rol.SUPERVISOR)
  @ApiOperation({ summary: 'Listar usuarios de la empresa' })
  @ApiQuery({ name: 'rol', enum: Rol, required: false })
  @ApiQuery({ name: 'activo', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(
    @CurrentUser('empresaId') empresaId: string,
    @Query('rol') rol?: Rol,
    @Query('activo') activo?: boolean,
  ) {
    return this.usuariosService.findAll(empresaId, { rol, activo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.usuariosService.findOne(id, empresaId);
  }

  @Post()
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    // Forzar que el usuario sea de la misma empresa
    createUsuarioDto.empresaId = empresaId;
    return this.usuariosService.create(createUsuarioDto);
  }

  @Put(':id')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto, empresaId);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Cambiar contraseña propia' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usuariosService.changePassword(userId, changePasswordDto);
  }

  @Patch(':id/deactivate')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Desactivar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.usuariosService.deactivate(id, empresaId);
  }

  @Patch(':id/activate')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Reactivar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.usuariosService.activate(id, empresaId);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN_EMPRESA)
  @ApiOperation({ summary: 'Eliminar usuario permanentemente' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('empresaId') empresaId: string,
  ) {
    return this.usuariosService.remove(id, empresaId);
  }
}
