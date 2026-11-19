import { PDFMensualGenerator, ReporteMensualData } from './pdf-mensual.generator';
const sharp = require('sharp') as any;

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const baseData = (): ReporteMensualData => ({
  organizacion: { nombre: 'Consultora Demo' },
  empresa: { nombre: 'Empresa Demo' },
  establecimientos: [{ nombre: 'Planta Norte' }],
  periodo: { desde: new Date('2026-01-01'), hasta: new Date('2026-01-31') },
  responsable: { nombre: 'Ana', apellido: 'Técnica', email: 'ana@demo.local' },
  inspecciones: [],
  hallazgos: [],
  acciones: [],
  fotos: [],
  incidenciasFotografias: 0,
});

describe('PDFMensualGenerator', () => {
  it('genera un PDF profesional sin logo ni fotografías', async () => {
    const pdf = await new PDFMensualGenerator().generate(baseData());
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('incrusta fotografías válidas y continúa ante una imagen inválida', async () => {
    const data = baseData();
    data.logo = onePixelPng;
    data.fotos = [
      { buffer: onePixelPng, nombre: 'evidencia-1.png' },
      { buffer: Buffer.from('invalid'), nombre: 'evidencia-invalida.png' },
      { buffer: onePixelPng, nombre: 'evidencia-2.png' },
    ];
    const pdf = await new PDFMensualGenerator().generate(data);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('genera correctamente un informe con una fotografía WebP', async () => {
    const webp = await sharp(onePixelPng).webp({ quality: 82 }).toBuffer();
    const data = baseData();
    data.fotos = [{ buffer: webp, nombre: 'evidencia-1.webp' }];
    const pdf = await new PDFMensualGenerator().generate(data);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('distribuye múltiples evidencias normalizadas entre páginas A4', async () => {
    const webp = await sharp(onePixelPng).webp({ quality: 82 }).toBuffer();
    const data = baseData();
    data.fotos = Array.from({ length: 8 }, (_, index) => ({
      buffer: index % 2 ? webp : onePixelPng,
      nombre: 'evidencia fotográfica',
      titulo: `Hallazgo ${index + 1}`,
      sector: 'Producción',
      establecimiento: 'Planta Norte',
      fecha: new Date('2026-11-19T12:00:00Z'),
    }));
    const pdf = await new PDFMensualGenerator().generate(data);
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    expect(pages).toBeGreaterThan(1);
  });
});
