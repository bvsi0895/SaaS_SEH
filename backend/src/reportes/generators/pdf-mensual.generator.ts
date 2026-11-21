import * as PDFDocument from 'pdfkit';
const sharp = require('sharp') as any;

export interface ReporteMensualData {
  organizacion: { nombre: string; logoUrl?: string | null; emailContacto?: string | null; telefono?: string | null; direccion?: string | null };
  empresa: { nombre: string; cuit?: string | null };
  establecimientos: Array<{ nombre: string; direccion?: string | null }>;
  periodo: { desde: Date; hasta: Date };
  responsable: { nombre: string; apellido: string; email: string };
  inspecciones: Array<{
    fecha: Date;
    establecimiento?: string | null;
    sector: string;
    checklist: string;
    tecnico: string;
    hallazgos: number;
  }>;
  hallazgos: Array<{
    titulo: string;
    nivel: string;
    estado?: string;
    fechaResolucion?: Date | null;
    descripcionSolucion?: string | null;
    responsableResolucion?: string | null;
    establecimiento?: string | null;
    sector?: string | null;
    fecha: Date;
  }>;
  acciones: Array<{ descripcion: string; estado: string; fechaCompromiso: Date; establecimiento?: string | null }>;
  fotos: Array<{ buffer: Buffer; nombre: string; titulo?: string; sector?: string | null; establecimiento?: string | null; fecha?: Date }>;
  incidenciasFotografias: number;
  logo?: Buffer | null;
  incidenciaLogo?: string;
}

export class PDFMensualGenerator {
  async generate(data: ReporteMensualData): Promise<Buffer> {
    const normalizedPhotos = await this.preparePhotos(data.fotos);
    const preparedData = { ...data, fotos: normalizedPhotos.fotos, incidenciasFotografias: data.incidenciasFotografias + normalizedPhotos.incidencias };
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        bufferPages: true,
        info: {
          Title: `Informe mensual - ${preparedData.empresa.nombre}`,
          Author: preparedData.organizacion.nombre,
          Subject: 'Informe mensual de Seguridad e Higiene',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.header(doc, preparedData);
      this.section(doc, 'RESUMEN EJECUTIVO');
      doc.fontSize(10).fillColor('#222').text(
        `Durante el período informado se realizaron ${preparedData.inspecciones.length} inspección(es), ` +
        `se registraron ${preparedData.hallazgos.length} hallazgo(s) y ${preparedData.acciones.length} acción(es) correctiva(s). ` +
        `Se incrustaron ${preparedData.fotos.length} fotografía(s) como evidencia.`,
        { lineGap: 3 },
      );
      if (preparedData.incidenciasFotografias > 0) {
        doc.moveDown(0.4).fillColor('#9a6700').text(`Advertencia: ${preparedData.incidenciasFotografias} evidencia(s) no pudieron recuperarse o procesarse y fueron omitidas.`);
      }
      doc.moveDown(0.8);

      this.section(doc, 'INSPECCIONES REALIZADAS');
      if (preparedData.inspecciones.length === 0) {
        doc.fontSize(10).fillColor('#555').text('No se registraron inspecciones en el período seleccionado.');
      } else {
        preparedData.inspecciones.forEach((item, index) => {
          this.ensureSpace(doc, 52);
          doc.fontSize(9).fillColor('#222').font('Helvetica-Bold')
            .text(`${index + 1}. ${this.date(item.fecha)} — ${item.checklist}`)
            .font('Helvetica')
            .text(`Establecimiento: ${item.establecimiento || 'Sin establecimiento'} | Sector: ${item.sector}`)
            .text(`Técnico: ${item.tecnico} | Hallazgos: ${item.hallazgos}`)
            .moveDown(0.35);
        });
      }

      this.section(doc, 'HALLAZGOS POR RIESGO');
      const riskCounts = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'].map((risk) => [
        risk,
        preparedData.hallazgos.filter((item) => item.nivel === risk).length,
      ]);
      doc.fontSize(10).fillColor('#222').text(riskCounts.map(([risk, count]) => `${risk}: ${count}`).join('   '));
      preparedData.hallazgos.forEach((item, index) => {
        this.ensureSpace(doc, 38);
        const resolution = item.descripcionSolucion
          ? ` — resolución: ${item.descripcionSolucion}${item.responsableResolucion ? ` (${item.responsableResolucion})` : ''}`
          : '';
        doc.fontSize(9).text(`${index + 1}. ${item.titulo} — ${item.nivel} — estado: ${this.hallazgoState(item.estado)} — ${item.establecimiento || 'Sin establecimiento'} — ${this.date(item.fecha)}${item.fechaResolucion ? ` — resuelto: ${this.date(item.fechaResolucion)}` : ''}${resolution}`);
      });

      this.section(doc, 'ACCIONES CORRECTIVAS');
      const states = ['PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'VENCIDA'].map((state) => [
        state,
        preparedData.acciones.filter((item) => item.estado === state).length,
      ]);
      doc.fontSize(10).text(states.map(([state, count]) => `${state}: ${count}`).join('   '));
      preparedData.acciones.forEach((item, index) => {
        this.ensureSpace(doc, 38);
        doc.fontSize(9).text(`${index + 1}. ${item.descripcion} — ${item.estado} — vencimiento ${this.date(item.fechaCompromiso)} — ${item.establecimiento || 'Sin establecimiento'}`);
      });

      this.section(doc, 'EVIDENCIAS FOTOGRÁFICAS');
      if (preparedData.fotos.length === 0) {
        doc.fontSize(10).fillColor('#555').text('No hay fotografías disponibles para este período.');
      } else {
        preparedData.fotos.forEach((photo, index) => {
          this.ensureSpace(doc, 205);
          const top = doc.y;
          const context = [photo.titulo, photo.sector ? `Sector: ${photo.sector}` : null, photo.establecimiento ? `Establecimiento: ${photo.establecimiento}` : null, photo.fecha ? this.date(photo.fecha) : null]
            .filter(Boolean).join(' | ');
          doc.fontSize(9).fillColor('#222').font('Helvetica-Bold').text(`${index + 1}. ${context || 'Evidencia fotográfica'}`);
          doc.font('Helvetica').fontSize(8).fillColor('#555').text('Evidencia fotográfica incorporada');
          doc.image(photo.buffer, 55, top + 34, { fit: [497, 145], align: 'center', valign: 'center' });
          doc.y = top + 190;
        });
      }

      this.section(doc, 'RESPONSABLE TÉCNICO');
      doc.fontSize(10).text(`${data.responsable.nombre} ${data.responsable.apellido} — ${data.responsable.email}`);
      doc.moveDown(1);
      if (preparedData.incidenciaLogo) doc.fontSize(8).fillColor('#9a6700').text(`Advertencia de identidad: ${preparedData.incidenciaLogo}`, { align: 'center' });
      doc.fontSize(8).fillColor('#666').text(`Generado el ${this.date(new Date())} por ${preparedData.organizacion.nombre}`, { align: 'center' });
      this.addPageNumbers(doc);
      doc.end();
    });
  }

  private async preparePhotos(photos: ReporteMensualData['fotos']) {
    const normalized: ReporteMensualData['fotos'] = [];
    let incidencias = 0;
    for (const photo of photos) {
      try {
        const buffer = await sharp(photo.buffer, { limitInputPixels: 40_000_000, failOn: 'warning' })
          .rotate().png().toBuffer();
        normalized.push({ ...photo, buffer });
      } catch {
        incidencias += 1;
      }
    }
    return { fotos: normalized, incidencias };
  }

  private header(doc: PDFKit.PDFDocument, data: ReporteMensualData) {
    if (data.logo) {
      try {
        doc.image(data.logo, 257, 48, { fit: [80, 48], align: 'center', valign: 'center' });
        doc.y = 105;
      } catch {
        // La incidencia se informa en el pie; el encabezado tipográfico sigue siendo válido.
      }
    }
    doc.fillColor('#1976d2').fontSize(20).font('Helvetica-Bold').text(data.organizacion.nombre, { align: 'center' });
    doc.font('Helvetica').fontSize(16).text('INFORME MENSUAL DE SEGURIDAD E HIGIENE', { align: 'center' });
    doc.moveDown(0.4).fillColor('#444').fontSize(11).text(`Empresa: ${data.empresa.nombre}${data.empresa.cuit ? ` — CUIT: ${data.empresa.cuit}` : ''}`, { align: 'center' });
    doc.text(`Período: ${this.date(data.periodo.desde)} al ${this.date(data.periodo.hasta)}`, { align: 'center' });
    if (data.organizacion.emailContacto || data.organizacion.telefono || data.organizacion.direccion) {
      doc.fontSize(8).text([data.organizacion.emailContacto, data.organizacion.telefono, data.organizacion.direccion].filter(Boolean).join(' | '), { align: 'center' });
    }
    doc.moveDown(0.7).strokeColor('#1976d2').lineWidth(2).moveTo(48, doc.y).lineTo(547, doc.y).stroke().moveDown(0.8);
    doc.fontSize(9).fillColor('#555').text(`Establecimientos incluidos: ${data.establecimientos.map((item) => item.nombre).join(', ') || 'Todos los autorizados'}`);
    doc.moveDown(0.5);
  }

  private section(doc: PDFKit.PDFDocument, title: string) {
    this.ensureSpace(doc, 70);
    doc.moveDown(0.7).fillColor('#1976d2').fontSize(13).font('Helvetica-Bold').text(title, { underline: true });
    doc.font('Helvetica').moveDown(0.35);
  }

  private ensureSpace(doc: PDFKit.PDFDocument, height: number) {
    if (doc.y + height > 735) doc.addPage();
  }

  private addPageNumbers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.strokeColor('#d0d7de').lineWidth(0.5).moveTo(48, 765).lineTo(547, 765).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#666')
        .text('SEH - Informe profesional', 48, 773, { width: 250, lineBreak: false })
        .text(`Página ${index + 1} de ${range.count}`, 347, 773, { width: 200, align: 'right', lineBreak: false });
    }
  }

  private date(value: Date): string {
    const date = new Date(value);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  }

  private hallazgoState(value?: string): string {
    switch (value) {
      case 'EN_CORRECCION': return 'En corrección';
      case 'SOLUCIONADO': return 'Solucionado';
      case 'PENDIENTE': return 'Pendiente';
      default: return value || 'Pendiente';
    }
  }
}
