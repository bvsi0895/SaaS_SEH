import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateHallazgoDto } from './update-hallazgo.dto';

describe('UpdateHallazgoDto', () => {
  it('rejects create-only inspection fields under forbidNonWhitelisted validation', async () => {
    const dto = plainToInstance(UpdateHallazgoDto, {
      titulo: 'Título actualizado',
      descripcion: 'Descripción actualizada suficientemente detallada',
      nivelRiesgo: 'MEDIO',
      ubicacionTexto: 'Sector A',
      inspeccionId: '00000000-0000-0000-0000-000000000001',
      inspeccionItemId: '00000000-0000-0000-0000-000000000002',
    });

    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    const rejectedProperties = errors.map((error) => error.property);

    expect(rejectedProperties).toEqual(expect.arrayContaining(['inspeccionId', 'inspeccionItemId']));
  });
});
