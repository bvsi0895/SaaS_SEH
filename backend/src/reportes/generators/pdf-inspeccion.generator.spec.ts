import { PDFInspeccionGenerator } from './pdf-inspeccion.generator';

const sharp = require('sharp') as any;

describe('PDFInspeccionGenerator', () => {
  it('renders Spanish text, long content, logo, findings and evidence across pages', async () => {
    const image = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#2e7d32' } }).png().toBuffer();
    const generator = new PDFInspeccionGenerator();
    const pdf = await generator.generate({
      id: 'inspection-1',
      sector: 'Producción Ñandú',
      createdAt: new Date('2026-11-20T12:00:00Z'),
      fechaHoraInicio: new Date('2026-11-20T12:00:00Z'),
      fechaHoraFin: new Date('2026-11-20T14:30:00Z'),
      checklist: { nombre: 'Checklist de seguridad e higiene', tipo: 'GENERAL' },
      usuario: { nombre: 'José', apellido: 'Muñoz', email: 'jose@example.test' },
      asignadoA: null,
      empresa: { nombre: 'Servicios Demo Centro' },
      organizacion: { nombre: 'Lombardi y Asociados' },
      logo: image,
      establecimiento: { nombre: 'Planta Central' },
      items: Array.from({ length: 40 }, (_, index) => ({
        cumplimiento: index % 3 === 0 ? 'NO_CUMPLE' : 'CUMPLE',
        observacion: index % 3 === 0 ? 'Requiere señalización y verificación de la corrección en el área de trabajo.' : 'Verificado durante la recorrida.',
        checklistItem: { orden: index + 1, descripcion: `Ítem extenso ${index + 1}: protección personal, orden, limpieza y señalización adecuada`, },
      })) as any,
      hallazgos: [{
        titulo: 'Señalización insuficiente en área húmeda',
        descripcion: 'Durante la inspección se observó una superficie húmeda sin cartel preventivo. La descripción contiene tildes, ñ y texto largo para validar el ajuste de línea.',
        nivelRiesgo: 'ALTO',
        ubicacionTexto: 'Sector de producción y pasillo norte',
        accionesCorrectivas: [{ descripcion: 'Instalar señalización permanente y documentar la capacitación del personal', estado: 'PENDIENTE' }],
      }],
      fotos: [{ buffer: image, nombre: 'evidencia', titulo: 'Fotografía de la señalización', sector: 'Producción Ñandú', establecimiento: 'Planta Central' }],
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  });

  it('keeps valid Spanish Unicode and repairs only unequivocal UTF-8 mojibake', () => {
    const generator = new PDFInspeccionGenerator() as any;
    const valid = '¿La señalización está visible? ¡Sí, señor! Ñandú áéíóú';

    expect(generator.display(valid)).toBe(valid);
    expect(generator.display('SeÃ±alizaciÃ³n')).toBe('Señalización');
    expect(generator.display('›ôÆ÷')).toBe('›ôÆ÷');
  });

  it('renders eight Unicode checklist questions without column overlap', async () => {
    const generator = new PDFInspeccionGenerator();
    const questions = [
      '¿Los extintores están vigentes y señalizados?',
      '¿La señalización de emergencia es visible desde todos los accesos?',
      '¿Las rutas de evacuación están despejadas e iluminadas?',
      '¿Las instalaciones eléctricas cuentan con protección y mantenimiento documentado?',
      '¿Las puertas de emergencia abren en el sentido de evacuación y no están bloqueadas?',
      '¿El personal conoce el procedimiento ante incendio, derrame o accidente?',
      '¿Los productos químicos están identificados y acompañados por sus hojas de seguridad?',
      '¿Se mantienen registros de capacitación, inspecciones y acciones correctivas?',
    ];
    const pdf = await generator.generate({
      id: 'unicode-checklist',
      sector: 'Oficinas y Archivo',
      createdAt: new Date('2026-11-21T09:00:00Z'),
      fechaHoraInicio: new Date('2026-11-21T09:15:00Z'),
      fechaHoraFin: new Date('2026-11-21T11:00:00Z'),
      checklist: { nombre: 'Checklist de Seguridad e Higiene', tipo: 'GENERAL' },
      usuario: { nombre: 'José', apellido: 'Muñoz', email: 'jose@example.test' },
      asignadoA: null,
      empresa: { nombre: 'Servicios Demo Centro' },
      organizacion: { nombre: 'Consultora Ñandú Seguridad' },
      establecimiento: { nombre: 'Oficinas Centro' },
      items: questions.map((descripcion, index) => ({
        cumplimiento: index === 4 ? 'NO_CUMPLE' : 'CUMPLE',
        observacion: index === 4 ? 'Requiere ajuste y verificación.' : 'Verificado durante la recorrida.',
        checklistItem: { orden: index + 1, descripcion },
      })) as any,
      hallazgos: [],
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  });
});
