import * as PDFDocument from 'pdfkit';

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
  hallazgos: Array<{ titulo: string; nivel: string; establecimiento?: string | null; fecha: Date }>;
  acciones: Array<{ descripcion: string; estado: string; fechaCompromiso: Date; establecimiento?: string | null }>;
  fotos: number;
}

export class PDFMensualGenerator {
  async generate(data: ReporteMensualData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 48,
        info: {
          Title: `Informe mensual - ${data.empresa.nombre}`,
          Author: data.organizacion.nombre,
          Subject: 'Informe mensual de Seguridad e Higiene',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.header(doc, data);
      this.section(doc, 'RESUMEN EJECUTIVO');
      doc.fontSize(10).fillColor('#222').text(
        `Durante el período informado se realizaron ${data.inspecciones.length} inspección(es), ` +
        `se registraron ${data.hallazgos.length} hallazgo(s) y ${data.acciones.length} acción(es) correctiva(s). ` +
        `Se adjuntaron ${data.fotos} fotografía(s) como evidencia.`,
        { lineGap: 3 },
      );
      doc.moveDown(0.8);

      this.section(doc, 'INSPECCIONES REALIZADAS');
      if (data.inspecciones.length === 0) {
        doc.fontSize(10).fillColor('#555').text('No se registraron inspecciones en el período seleccionado.');
      } else {
        data.inspecciones.forEach((item, index) => {
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
        data.hallazgos.filter((item) => item.nivel === risk).length,
      ]);
      doc.fontSize(10).fillColor('#222').text(riskCounts.map(([risk, count]) => `${risk}: ${count}`).join('   '));
      data.hallazgos.forEach((item, index) => {
        this.ensureSpace(doc, 38);
        doc.fontSize(9).text(`${index + 1}. ${item.titulo} — ${item.nivel} — ${item.establecimiento || 'Sin establecimiento'} — ${this.date(item.fecha)}`);
      });

      this.section(doc, 'ACCIONES CORRECTIVAS');
      const states = ['PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'VENCIDA'].map((state) => [
        state,
        data.acciones.filter((item) => item.estado === state).length,
      ]);
      doc.fontSize(10).text(states.map(([state, count]) => `${state}: ${count}`).join('   '));
      data.acciones.forEach((item, index) => {
        this.ensureSpace(doc, 38);
        doc.fontSize(9).text(`${index + 1}. ${item.descripcion} — ${item.estado} — vencimiento ${this.date(item.fechaCompromiso)} — ${item.establecimiento || 'Sin establecimiento'}`);
      });

      this.section(doc, 'RESPONSABLE TÉCNICO');
      doc.fontSize(10).text(`${data.responsable.nombre} ${data.responsable.apellido} — ${data.responsable.email}`);
      doc.moveDown(1);
      doc.fontSize(8).fillColor('#666').text(`Generado el ${this.date(new Date())} por ${data.organizacion.nombre}`, { align: 'center' });
      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument, data: ReporteMensualData) {
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
    if (doc.y + height > 745) doc.addPage();
  }

  private date(value: Date): string {
    return new Date(value).toLocaleDateString('es-AR');
  }
}
