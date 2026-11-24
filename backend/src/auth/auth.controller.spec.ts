import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController.refreshTokens', () => {
  it('delegates the raw token and preserves service HTTP exceptions', async () => {
    const service = {
      refreshTokens: jest.fn().mockRejectedValue(new UnauthorizedException('Token revocado')),
    };
    const controller = new AuthController(service as never, {} as never);

    await expect(controller.refreshTokens({ refreshToken: 'token' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.refreshTokens).toHaveBeenCalledWith('token');
  });
});
