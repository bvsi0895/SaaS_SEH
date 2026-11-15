import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
const sharp = require('sharp') as any;
import { HallazgosService } from './hallazgos.service';

const testUploadDir = '.test-uploads-webp';

const createHallazgo = () => ({
  id: 'hallazgo-1',
  fotosUrls: null as string | null,
  inspeccion: {
    id: 'inspeccion-1',
    empresaId: 'empresa-origen',
    organizacionEmpresaId: 'contexto-a',
    estado: 'EN_PROGRESO',
    accionesCorrectivas: [],
  },
});

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

  it('does not expose a finding from another organization context', async () => {
    const prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(createHallazgo()),
      },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.findOne('hallazgo-1', 'empresa-origen', 'contexto-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('HallazgosService WebP optimization', () => {
  const previousUploadDir = process.env.UPLOAD_DIR;
  const previousMaxPixels = process.env.MAX_IMAGE_PIXELS;
  let hallazgo: ReturnType<typeof createHallazgo>;
  let prisma: { hallazgo: { findUnique: jest.Mock; update: jest.Mock } };
  let service: HallazgosService;

  beforeEach(async () => {
    process.env.UPLOAD_DIR = testUploadDir;
    process.env.MAX_IMAGE_PIXELS = '40000000';
    await rm(testUploadDir, { recursive: true, force: true });
    hallazgo = createHallazgo();
    prisma = {
      hallazgo: {
        findUnique: jest.fn().mockResolvedValue(hallazgo),
        update: jest.fn().mockImplementation(async ({ data }) => {
          hallazgo.fotosUrls = data.fotosUrls;
          return hallazgo;
        }),
      },
    };
    service = new HallazgosService(prisma as never);
  });

  afterAll(async () => {
    await rm(testUploadDir, { recursive: true, force: true });
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    if (previousMaxPixels === undefined) delete process.env.MAX_IMAGE_PIXELS;
    else process.env.MAX_IMAGE_PIXELS = previousMaxPixels;
  });

  it.each([
    ['jpeg', 'jpeg'],
    ['png', 'png'],
    ['webp', 'webp'],
  ])('converts a valid %s to WebP', async (_label, format) => {
    const input = await sharp({ create: { width: 120, height: 80, channels: 3, background: 'red' } })
      .toFormat(format as 'jpeg' | 'png' | 'webp')
      .toBuffer();

    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: input, originalname: `foto.${format}` }, 'contexto-a');

    const filename = JSON.parse(hallazgo.fotosUrls as string)[0].split('/').pop() as string;
    expect(filename).toMatch(/\.webp$/);
    const stored = await readFile(`${testUploadDir}/hallazgos/${filename}`);
    expect((await sharp(stored).metadata()).format).toBe('webp');
  });

  it('limits the longest side to 1920 without enlarging small images', async () => {
    const large = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: 'blue' } }).jpeg().toBuffer();
    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: large, originalname: 'large.jpg' }, 'contexto-a');
    const largeName = JSON.parse(hallazgo.fotosUrls as string)[0].split('/').pop() as string;
    const largeMetadata = await sharp(await readFile(`${testUploadDir}/hallazgos/${largeName}`)).metadata();
    expect(largeMetadata.width).toBe(1920);
    expect(largeMetadata.height).toBe(1440);

    hallazgo.fotosUrls = null;
    const small = await sharp({ create: { width: 320, height: 200, channels: 3, background: 'green' } }).png().toBuffer();
    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: small, originalname: 'small.png' }, 'contexto-a');
    const smallName = JSON.parse(hallazgo.fotosUrls!)[0].split('/').pop() as string;
    const smallMetadata = await sharp(await readFile(`${testUploadDir}/hallazgos/${smallName}`)).metadata();
    expect(smallMetadata.width).toBe(320);
    expect(smallMetadata.height).toBe(200);
  });

  it('applies EXIF orientation before writing WebP', async () => {
    const oriented = await sharp({ create: { width: 40, height: 20, channels: 3, background: 'yellow' } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: oriented, originalname: 'oriented.jpg' }, 'contexto-a');
    const filename = JSON.parse(hallazgo.fotosUrls as string)[0].split('/').pop() as string;
    const metadata = await sharp(await readFile(`${testUploadDir}/hallazgos/${filename}`)).metadata();
    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(40);
    expect(metadata.orientation).toBeUndefined();
  });

  it('rejects corrupt and excessive images without persisting a file', async () => {
    await expect(
      service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: Buffer.from('not-an-image'), originalname: 'bad.jpg' }, 'contexto-a'),
    ).rejects.toBeInstanceOf(BadRequestException);

    process.env.MAX_IMAGE_PIXELS = '1000';
    const excessive = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'black' } }).png().toBuffer();
    await expect(
      service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: excessive, originalname: 'too-many-pixels.png' }, 'contexto-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.update).not.toHaveBeenCalled();
  });

  it('continues reading a legacy JPEG stored before WebP optimization', async () => {
    const legacy = await sharp({ create: { width: 16, height: 12, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const filename = 'hallazgo-1-legacy.jpg';
    hallazgo.fotosUrls = JSON.stringify([`/api/hallazgos/hallazgo-1/fotos/${filename}`]);
    await mkdir(`${testUploadDir}/hallazgos`, { recursive: true });
    await writeFile(`${testUploadDir}/hallazgos/${filename}`, legacy);

    await expect(service.getPhoto('hallazgo-1', filename, 'empresa-origen', 'contexto-a')).resolves.toEqual(legacy);
  });

  it('appends a second photo without removing the first one', async () => {
    const first = await sharp({ create: { width: 20, height: 20, channels: 3, background: 'red' } }).jpeg().toBuffer();
    const second = await sharp({ create: { width: 24, height: 24, channels: 3, background: 'blue' } }).png().toBuffer();

    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: first, originalname: 'first.jpg' }, 'contexto-a');
    const firstPhoto = JSON.parse(hallazgo.fotosUrls as string)[0];
    await service.addPhoto('hallazgo-1', 'empresa-origen', { buffer: second, originalname: 'second.png' }, 'contexto-a');

    const photos = JSON.parse(hallazgo.fotosUrls as string) as string[];
    expect(photos).toHaveLength(2);
    expect(photos[0]).toBe(firstPhoto);
    expect(photos[1]).toMatch(/\.webp$/);
  });
});

describe('HallazgosService linked inspection findings', () => {
  it('validates the item belongs to the inspection before creating a finding', async () => {
    const prisma = {
      inspeccion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inspeccion-1',
          empresaId: 'empresa-1',
          organizacionEmpresaId: 'contexto-1',
          estado: 'EN_PROGRESO',
        }),
      },
      inspeccionItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'item-1', inspeccionId: 'otra-inspeccion' }),
      },
      hallazgo: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const service = new HallazgosService(prisma as never);

    await expect(service.create({
      inspeccionId: 'inspeccion-1',
      inspeccionItemId: 'item-1',
      titulo: 'Incumplimiento de seguridad',
      descripcion: 'Descripción suficientemente detallada',
      nivelRiesgo: 'MEDIO',
      ubicacionTexto: 'Sector A',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.hallazgo.create).not.toHaveBeenCalled();
  });

  it('updates the existing linked finding instead of creating a duplicate', async () => {
    const existing = {
      id: 'hallazgo-1',
      fotosUrls: null,
      inspeccion: {
        id: 'inspeccion-1',
        empresaId: 'empresa-1',
        organizacionEmpresaId: 'contexto-1',
        estado: 'EN_PROGRESO',
      },
      accionesCorrectivas: [],
    };
    const prisma = {
      inspeccion: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inspeccion-1',
          empresaId: 'empresa-1',
          organizacionEmpresaId: 'contexto-1',
          estado: 'EN_PROGRESO',
        }),
      },
      inspeccionItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 'item-1', inspeccionId: 'inspeccion-1' }),
      },
      hallazgo: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ id: 'hallazgo-1' })
          .mockResolvedValueOnce(existing),
        update: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const service = new HallazgosService(prisma as never);

    await service.create({
      inspeccionId: 'inspeccion-1',
      inspeccionItemId: 'item-1',
      titulo: 'Incumplimiento actualizado',
      descripcion: 'Descripción actualizada suficientemente detallada',
      nivelRiesgo: 'ALTO',
      ubicacionTexto: 'Sector B',
    }, 'empresa-1', 'contexto-1');

    expect(prisma.hallazgo.create).not.toHaveBeenCalled();
    expect(prisma.hallazgo.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'hallazgo-1' },
    }));
  });
});
