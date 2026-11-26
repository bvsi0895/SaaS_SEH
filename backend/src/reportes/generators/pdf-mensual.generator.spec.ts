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

  it('presenta el resumen, tablas, hallazgos, acciones y referencia de la evidencia', async () => {
    const data = baseData();
    data.logo = onePixelPng;
    data.fechaCorte = new Date('2026-01-31');
    data.inspecciones = [{
      fecha: new Date('2026-01-19'),
      establecimiento: 'Planta Norte',
      sector: 'Producción',
      checklist: 'Checklist general',
      tecnico: 'Ana Técnica',
      hallazgos: 1,
    }];
    data.hallazgos = [{
      titulo: 'Señalización insuficiente',
      descripcion: 'Se observó una superficie húmeda sin cartel preventivo.',
      nivel: 'ALTO',
      estado: 'PENDIENTE',
      ubicacion: 'Pasillo norte',
      fecha: new Date('2026-01-19'),
      establecimiento: 'Planta Norte',
      sector: 'Producción',
      descripcionSolucion: 'Instalar señalización permanente.',
      fechaResolucion: null,
      responsableResolucion: null,
    }];
    data.acciones = [{
      descripcion: 'Instalar señalización permanente y verificar su estado.',
      estado: 'PENDIENTE',
      fechaCompromiso: new Date('2026-02-01'),
      establecimiento: 'Planta Norte',
    }];
    data.fotos = [{
      buffer: onePixelPng,
      nombre: 'evidencia-1.png',
      titulo: 'Señalización insuficiente',
      hallazgoTitulo: 'Señalización insuficiente',
      descripcion: 'Evidencia de la condición observada.',
      hallazgoId: 'hallazgo-1',
      establecimiento: 'Planta Norte',
      sector: 'Producción',
      fecha: new Date('2026-01-19'),
    }];

    const pdf = await new PDFMensualGenerator().generate(data);
    const source = pdf.toString('latin1');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect((source.match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((source.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  });

  it('pagina textos largos y conserva un informe válido con datos faltantes', async () => {
    const data = baseData();
    data.empresa.cuit = null;
    data.establecimientos = [];
    data.inspecciones = [{
      fecha: new Date('2026-01-19'),
      establecimiento: null,
      sector: 'Producción',
      checklist: 'Checklist general',
      tecnico: 'Ana Técnica',
      hallazgos: 8,
    }];
    data.hallazgos = Array.from({ length: 8 }, (_, index) => ({
      titulo: `Hallazgo ${index + 1}`,
      descripcion: 'Descripción extensa del hallazgo con información operativa, medidas preventivas y contexto suficiente para comprobar el ajuste de línea dentro del bloque del informe mensual.',
      nivel: index % 2 === 0 ? 'MEDIO' : 'BAJO',
      estado: 'EN_CORRECCION',
      ubicacion: 'Sector de producción y pasillo norte',
      fecha: new Date('2026-01-19'),
      establecimiento: null,
      sector: 'Producción',
      descripcionSolucion: index % 2 === 0 ? 'Se inició la corrección y se programó una verificación posterior.' : null,
      fechaResolucion: null,
      responsableResolucion: null,
    }));

    const pdf = await new PDFMensualGenerator().generate(data);
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pages).toBeGreaterThan(1);
  });

  it('rechaza un informe cuando el resumen de inspecciones no coincide con el detalle', async () => {
    const data = baseData();
    data.inspecciones = [{
      fecha: new Date('2026-01-19'),
      establecimiento: 'Planta Norte',
      sector: 'Producción',
      checklist: 'Checklist general',
      tecnico: 'Ana Técnica',
      hallazgos: 2,
    }];
    data.hallazgos = [{
      titulo: 'Hallazgo único',
      descripcion: 'Descripción',
      nivel: 'MEDIO',
      estado: 'PENDIENTE',
      fecha: new Date('2026-01-19'),
    }];

    await expect(new PDFMensualGenerator().generate(data)).rejects.toThrow('Datos inconsistentes');
  });

  it('fragmenta una acción correctiva que supera la altura de una página', async () => {
    const data = baseData();
    data.acciones = [{
      descripcion: Array.from({ length: 150 }, () => 'Plan correctivo de mantenimiento.').join(' '),
      estado: 'PENDIENTE',
      fechaCompromiso: new Date('2026-02-01'),
      establecimiento: 'Planta Norte',
    }];

    const pdf = await new PDFMensualGenerator().generate(data);
    const pages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pages).toBeGreaterThan(2);
  });
});

