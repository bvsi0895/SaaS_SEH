import { NotFoundException } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';

describe('HallazgosService authorization', () => {
  it('does not expose a finding from another company', async () => {
    const prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'hallazgo-1',
          fotosUrls: null,
          inspeccion: {
            id: 'inspeccion-1',
            empresaId: 'empresa-origen',
            estado: 'EN_PROGRESO',
            accionesCorrectivas: [],
          },
        }),
      },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.getPhoto('hallazgo-1', 'foto.png', 'empresa-ajena')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
