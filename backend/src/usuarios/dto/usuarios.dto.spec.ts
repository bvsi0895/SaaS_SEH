import { validate } from 'class-validator';
import { CreateUsuarioDto, ChangePasswordDto, AdminChangePasswordDto } from './index';
import { RegisterDto } from '../../auth/dto/register.dto';
import { LoginDto } from '../../auth/dto/login.dto';

describe('password DTO policy', () => {
  it('allows existing short passwords at login', async () => {
    const dto = Object.assign(new LoginDto(), { email: 'legacy@example.com', password: 'legacy' });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts any composition with at least eight characters', async () => {
    const create = Object.assign(new CreateUsuarioDto(), {
      email: 'user@example.com', password: 'abcdefgh', nombre: 'Ana', apellido: 'Pérez',
    });
    const register = Object.assign(new RegisterDto(), {
      email: 'user@example.com', password: '12345678', nombre: 'Ana', apellido: 'Pérez',
    });
    const change = Object.assign(new ChangePasswordDto(), {
      currentPassword: '12345678', newPassword: 'password',
    });
    const admin = Object.assign(new AdminChangePasswordDto(), { newPassword: '12345678' });

    await expect(validate(create)).resolves.toHaveLength(0);
    await expect(validate(register)).resolves.toHaveLength(0);
    await expect(validate(change)).resolves.toHaveLength(0);
    await expect(validate(admin)).resolves.toHaveLength(0);
  });

  it('rejects passwords shorter than eight characters', async () => {
    const dto = Object.assign(new CreateUsuarioDto(), {
      email: 'user@example.com', password: 'short', nombre: 'Ana', apellido: 'Pérez',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
