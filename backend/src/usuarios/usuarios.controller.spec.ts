import { UsuariosController } from './usuarios.controller';

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
