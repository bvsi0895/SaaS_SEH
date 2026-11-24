import { validate } from 'class-validator';
import { RefreshTokenDto } from './auth-response.dto';

describe('RefreshTokenDto', () => {
  it('requires a non-empty string refresh token', async () => {
    const missing = await validate(Object.assign(new RefreshTokenDto(), {}));
    const invalid = await validate(Object.assign(new RefreshTokenDto(), { refreshToken: 123 }));
    const valid = await validate(Object.assign(new RefreshTokenDto(), { refreshToken: 'signed-refresh-token' }));

    expect(missing.some((error) => error.property === 'refreshToken')).toBe(true);
    expect(invalid.some((error) => error.property === 'refreshToken')).toBe(true);
    expect(valid).toHaveLength(0);
  });
});
