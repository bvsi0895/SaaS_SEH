import { PDFMensualGenerator, ReporteMensualData } from './pdf-mensual.generator';

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
});
