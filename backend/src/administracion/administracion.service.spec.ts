import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { readFile, unlink, writeFile } from 'fs/promises';
import { AdministracionService } from './administracion.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('AdministracionService logo storage', () => {
  const prisma = {
    organizacionMiembro: { findFirst: jest.fn() },
    organizacion: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  let service: AdministracionService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organizacionMiembro.findFirst.mockResolvedValue({ id: 'member-1', rol: 'ADMIN_ORGANIZACION' });
    prisma.organizacion.findUniqueOrThrow.mockResolvedValue({ logoUrl: null });
    prisma.organizacion.update.mockImplementation(({ data }: { data: { logoUrl?: string | null } }) => ({ id: 'org-1', logoUrl: data.logoUrl ?? null }));
    (writeFile as jest.Mock).mockResolvedValue(undefined);
    (unlink as jest.Mock).mockResolvedValue(undefined);
    service = new AdministracionService(prisma as never);
  });

  it('validates the image bytes and persists a tenant-scoped normalized logo path', async () => {
    const result = await service.uploadLogo('org-1', 'admin-1', {
      buffer: onePixelPng,
      originalname: 'marca.png',
      mimetype: 'image/png',
    });

    expect(result.logoUrl).toMatch(/^uploads\/logos\/org-1-[0-9a-f-]+\.png$/);
    expect(prisma.organizacion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'org-1' },
      data: expect.objectContaining({ logoUrl: expect.stringContaining('uploads/logos/org-1-') }),
    }));
    expect(writeFile).toHaveBeenCalled();
  });

  it('rejects a file with invalid image content even when its extension is allowed', async () => {
    await expect(service.uploadLogo('org-1', 'admin-1', {
      buffer: Buffer.from('not-an-image'),
      originalname: 'marca.png',
      mimetype: 'image/png',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });

  it('reads and deletes only the organization logo through the authorized tenant context', async () => {
    prisma.organizacion.findUniqueOrThrow.mockResolvedValue({ logoUrl: 'uploads/logos/org-1-old.png' });
    (readFile as jest.Mock).mockResolvedValue(onePixelPng);
    await expect(service.getLogo('org-1', 'admin-1')).resolves.toEqual(expect.objectContaining({ contentType: 'image/png' }));
    await service.deleteLogo('org-1', 'admin-1');
    expect(prisma.organizacion.update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { logoUrl: null } });
    expect(prisma.organizacionMiembro.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizacionId: 'org-1', usuarioId: 'admin-1' }) }));
  });

  it.each([
    ['Lucía', 'lucia-1', 'AUDITOR_ORGANIZACION'],
    ['Juan', 'juan-1', 'AUDITOR_ORGANIZACION'],
  ])('allows %s to read the active consultant logo without admin privileges', async (_name, usuarioId, rol) => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue({ id: `${usuarioId}-member`, rol });
    prisma.organizacion.findUniqueOrThrow.mockResolvedValue({ logoUrl: 'uploads/logos/consultora-a.png' });
    (readFile as jest.Mock).mockResolvedValue(onePixelPng);

    await expect(service.getLogo('consultora-a', usuarioId)).resolves.toEqual(expect.objectContaining({ contentType: 'image/png' }));
    expect(prisma.organizacionMiembro.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizacionId: 'consultora-a', usuarioId, activa: true }),
    }));
  });

  it('denies a member from another organization and does not read the stored file', async () => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue(null);

    await expect(service.getLogo('consultora-a', 'juan-de-consultora-b')).rejects.toBeInstanceOf(ForbiddenException);
    expect(readFile).not.toHaveBeenCalled();
    expect(prisma.organizacion.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('keeps logo deletion restricted to organization administrators', async () => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue({ id: 'member-1', rol: 'AUDITOR_ORGANIZACION' });

    await expect(service.deleteLogo('org-1', 'member-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });

  it('does not allow a member without organization admin role to write a logo', async () => {
    prisma.organizacionMiembro.findFirst.mockResolvedValue(null);
    await expect(service.uploadLogo('org-other', 'member-2', {
      buffer: onePixelPng,
      originalname: 'marca.png',
      mimetype: 'image/png',
    })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizacion.update).not.toHaveBeenCalled();
  });
});

