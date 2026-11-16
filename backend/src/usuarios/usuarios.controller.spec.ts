import { UsuariosController } from './usuarios.controller';
import { Rol } from '@prisma/client';

describe('UsuariosController.changePassword', () => {
  it('uses the authenticated user id and does not accept a target user id from the form', async () => {
    const usuariosService = {
      changePassword: jest.fn().mockResolvedValue({ message: 'Contraseña actualizada exitosamente' }),
    };
    const controller = new UsuariosController(usuariosService as never);
    const dto = {
      currentPassword: 'Current123!',
      newPassword: 'NewPassword123!',
      id: 'other-user',
    };

    await controller.changePassword('authenticated-user', dto);

    expect(usuariosService.changePassword).toHaveBeenCalledWith('authenticated-user', dto);
    expect(usuariosService.changePassword).not.toHaveBeenCalledWith('other-user', expect.anything());
  });
});

describe('UsuariosController.create', () => {
  it('passes the session company instead of trusting a body company id', async () => {
    const usuariosService = {
      create: jest.fn().mockResolvedValue({ id: 'user-created' }),
    };
    const controller = new UsuariosController(usuariosService as never);
    const dto = {
      email: 'tecnico@demo.local',
      password: 'simplepass',
      nombre: 'Ana',
      apellido: 'Técnica',
      rol: Rol.TECNICO,
      empresaId: 'company-from-browser',
    };

    await controller.create(dto, 'company-from-session', 'org-1', 'org-company-1');

    expect(usuariosService.create).toHaveBeenCalledWith(
      dto,
      'company-from-session',
      'org-1',
      'org-company-1',
    );
  });
});
