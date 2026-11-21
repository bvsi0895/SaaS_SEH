import * as PDFDocument from 'pdfkit';
import { CumplimientoItem, NivelRiesgo } from '@prisma/client';

const sharp = require('sharp') as any;

interface ReportPhoto {
  buffer: Buffer;
  nombre: string;
  titulo?: string;
  sector?: string | null;
  establecimiento?: string | null;
  fecha?: Date;
}

interface InspeccionData {
  id: string;
  sector: string;
  descripcion?: string | null;
  fechaHoraInicio?: Date | null;
  fechaHoraFin?: Date | null;
  createdAt: Date;
  fechaProgramada?: Date | null;
  observaciones?: string | null;
  estado?: string;
  checklist: { nombre: string; tipo: string };
  usuario: { nombre: string; apellido: string; email: string };
  asignadoA?: { nombre: string; apellido: string; email: string } | null;
  empresa?: { nombre: string; cuit?: string | null };
  organizacion?: { nombre: string; emailContacto?: string | null; telefono?: string | null; direccion?: string | null };
  logo?: Buffer | null;
  establecimiento?: { nombre: string; direccion?: string | null } | null;
  items: Array<{
    cumplimiento: CumplimientoItem;
    observacion?: string | null;
    checklistItem: { descripcion: string; orden: number };
  }>;
  hallazgos: Array<{
    titulo: string;
    descripcion: string;
    nivelRiesgo: NivelRiesgo;
    estado?: string;
    fechaResolucion?: Date | null;
    descripcionSolucion?: string | null;
    responsableResolucion?: { nombre: string; apellido: string } | null;
    ubicacionTexto?: string | null;
    fotosUrls?: string | null;
    accionesCorrectivas: Array<{ descripcion: string; estado: string }>;
  }>;
  fotos?: ReportPhoto[];
  incidenciasFotografias?: number;
}

type PdfDocument = PDFKit.PDFDocument;

export class PDFInspeccionGenerator {
  private readonly colors = {
    primary: '#1f5f8b',
    success: '#2e7d32',
    warning: '#b26a00',
    danger: '#c62828',
    gray: '#5f6b76',
    lightGray: '#e5e7eb',
    paleBlue: '#eef5fa',
  };

  private readonly left = 48;
  private readonly right = 547;
  private readonly contentWidth = 499;
  private readonly top = 48;
  private readonly bottom = 748;

  async generate(inspeccion: InspeccionData): Promise<Buffer> {
    const photos = await this.preparePhotos(inspeccion.fotos || []);
    const data = { ...inspeccion, fotos: photos.fotos, incidenciasFotografias: (inspeccion.incidenciasFotografias || 0) + photos.incidencias };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.left,
          bufferPages: true,
          info: {
            Title: `Reporte de Inspección - ${this.display(data.sector)}`,
            Author: `${this.display((data.asignadoA ?? data.usuario).nombre)} ${this.display((data.asignadoA ?? data.usuario).apellido)}`,
            Subject: 'Reporte de Inspección de Seguridad e Higiene',
          },
        });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.addHeader(doc, data);
        this.addDatosGenerales(doc, data);
        this.addChecklist(doc, data);
        this.addHallazgos(doc, data);
        this.addEvidence(doc, data);
        this.addSignature(doc, data);
        this.addPageNumbers(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PdfDocument, data: InspeccionData) {
    if (data.logo) {
      try {
        doc.image(data.logo, this.left, this.top, { fit: [92, 54], valign: 'center' });
      } catch {
        // A malformed logo must not prevent the report from being generated.
      }
    } else {
      doc.roundedRect(this.left, this.top + 4, 82, 42, 5).fill(this.colors.primary);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text('SEH', this.left, this.top + 15, { width: 82, align: 'center' });
    }

    const organization = this.display(data.organizacion?.nombre || 'Sistema de Seguridad e Higiene');
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(16)
      .text(organization, this.left + 105, this.top + 3, { width: this.contentWidth - 105 });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9)
      .text('Seguridad e Higiene | Reporte institucional de inspección', this.left + 105, this.top + 26, { width: this.contentWidth - 105 });
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(19)
      .text('REPORTE DE INSPECCIÓN', this.left, this.top + 76, { width: this.contentWidth, align: 'center' });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(10)
      .text(`Inspección de ${this.display(data.sector)}`, this.left, this.top + 101, { width: this.contentWidth, align: 'center' });
    doc.strokeColor(this.colors.primary).lineWidth(2).moveTo(this.left, this.top + 125).lineTo(this.right, this.top + 125).stroke();
    doc.y = this.top + 143;
  }

  private addDatosGenerales(doc: PdfDocument, data: InspeccionData) {
    this.sectionTitle(doc, 'DATOS GENERALES');
    const inspector = data.asignadoA ?? data.usuario;
    const rows: Array<[string, string]> = [
      ['Empresa', data.empresa?.nombre || 'No informada'],
      ['Establecimiento', data.establecimiento?.nombre || 'Sin establecimiento'],
      ['Checklist', data.checklist.nombre],
      ['Tipo', data.checklist.tipo],
      ['Sector / área', data.sector],
      ['Inspector técnico', `${inspector.nombre} ${inspector.apellido}`],
      ['Creación', this.formatDate(data.createdAt)],
      ['Inicio real', data.fechaHoraInicio ? this.formatDate(data.fechaHoraInicio) : 'No iniciada'],
      ['Finalización', data.fechaHoraFin ? this.formatDate(data.fechaHoraFin) : 'Pendiente'],
      ['Duración', this.calcularDuracion(data.fechaHoraInicio, data.fechaHoraFin ?? undefined)],
    ];
    if (data.descripcion) rows.push(['Descripción', data.descripcion]);
    if (data.observaciones) rows.push(['Observaciones', data.observaciones]);

    const labelWidth = 125;
    const valueWidth = this.contentWidth - labelWidth - 10;
    rows.forEach(([label, value], index) => {
      const height = Math.max(18, doc.heightOfString(this.display(value), { width: valueWidth, lineGap: 2 }) + 6);
      this.ensureSpace(doc, height + 2, data);
      if (index % 2 === 0) doc.rect(this.left, doc.y - 2, this.contentWidth, height).fill(this.colors.paleBlue);
      doc.fillColor(this.colors.gray).font('Helvetica-Bold').fontSize(9).text(`${this.display(label)}:`, this.left + 7, doc.y + 2, { width: labelWidth - 10 });
      doc.fillColor('#222').font('Helvetica').fontSize(9).text(this.display(value), this.left + labelWidth, doc.y + 2, { width: valueWidth, lineGap: 2 });
      doc.y = doc.y + Math.max(0, height - 15);
    });
    doc.moveDown(0.7);
  }

  private addChecklist(doc: PdfDocument, data: InspeccionData) {
    this.sectionTitle(doc, 'RESULTADOS DEL CHECKLIST');
    const counts = {
      cumple: data.items.filter((item) => item.cumplimiento === 'CUMPLE').length,
      noCumple: data.items.filter((item) => item.cumplimiento === 'NO_CUMPLE').length,
      noAplica: data.items.filter((item) => item.cumplimiento === 'NO_APLICA').length,
      observacion: data.items.filter((item) => item.cumplimiento === 'OBSERVACION').length,
    };
    doc.fillColor('#222').font('Helvetica').fontSize(9)
      .text(`Resumen: ${counts.cumple} cumple | ${counts.noCumple} no cumple | ${counts.noAplica} no aplica | ${counts.observacion} observación(es)`, { lineGap: 2 })
      .moveDown(0.45);

    const columns = { item: 235, estado: 84, observacion: this.contentWidth - 235 - 84 };
    this.ensureChecklistHeader(doc, data, columns);
    data.items.forEach((item, index) => {
      const itemText = `${item.checklistItem.orden}. ${this.display(item.checklistItem.descripcion)}`;
      const observationText = this.display(item.observacion || '-');
      const itemHeight = doc.heightOfString(itemText, { width: columns.item - 12, lineGap: 2 });
      const observationHeight = doc.heightOfString(observationText, { width: columns.observacion - 12, lineGap: 2 });
      const rowHeight = Math.max(25, itemHeight, observationHeight) + 8;
      if (doc.y + rowHeight > this.bottom) {
        doc.addPage();
        this.addContinuationHeader(doc, data);
        this.ensureChecklistHeader(doc, data, columns);
      }
      const tableY = doc.y;
      if (index % 2 === 0) doc.rect(this.left, tableY, this.contentWidth, rowHeight).fill('#f7fafc');
      doc.strokeColor(this.colors.lightGray).lineWidth(0.5).rect(this.left, tableY, this.contentWidth, rowHeight).stroke();
      doc.fillColor('#222').font('Helvetica').fontSize(8.5).text(itemText, this.left + 6, tableY + 5, { width: columns.item - 12, lineGap: 2 });
      doc.fillColor(this.getStatusColor(item.cumplimiento)).font('Helvetica-Bold').text(this.getStatusText(item.cumplimiento), this.left + columns.item + 6, tableY + 5, { width: columns.estado - 12, lineGap: 2 });
      doc.fillColor('#333').font('Helvetica').text(observationText, this.left + columns.item + columns.estado + 6, tableY + 5, { width: columns.observacion - 12, lineGap: 2 });
      doc.y = tableY + rowHeight;
    });
    doc.moveDown(0.8);
  }

  private ensureChecklistHeader(doc: PdfDocument, data: InspeccionData, columns: { item: number; estado: number; observacion: number }): number {
    this.ensureSpace(doc, 28, data);
    const y = doc.y;
    doc.rect(this.left, y, this.contentWidth, 22).fill(this.colors.primary);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5)
      .text('Ítem del checklist', this.left + 6, y + 6, { width: columns.item - 12 })
      .text('Estado', this.left + columns.item + 6, y + 6, { width: columns.estado - 12 })
      .text('Observación', this.left + columns.item + columns.estado + 6, y + 6, { width: columns.observacion - 12 });
    doc.y = y + 22;
    return doc.y;
  }

  private addHallazgos(doc: PdfDocument, data: InspeccionData) {
    this.sectionTitle(doc, 'HALLAZGOS DETECTADOS');
    if (data.hallazgos.length === 0) {
      doc.fillColor(this.colors.success).font('Helvetica').fontSize(10)
        .text('No se detectaron hallazgos durante esta inspección.', { lineGap: 3 });
      doc.moveDown(0.8);
      return;
    }
    doc.fillColor('#222').font('Helvetica').fontSize(9).text(`Total: ${data.hallazgos.length} hallazgo(s)`).moveDown(0.45);
    data.hallazgos.forEach((hallazgo, index) => {
      this.ensureSpace(doc, 135, data);
      const start = doc.y;
      const riskColor = this.getRiesgoColor(hallazgo.nivelRiesgo);
      doc.rect(this.left, start, 5, 20).fill(riskColor);
      doc.fillColor('#222').font('Helvetica-Bold').fontSize(10.5).text(`${index + 1}. ${this.display(hallazgo.titulo)}`, this.left + 14, start, { width: this.contentWidth - 14 });
      doc.fillColor(riskColor).font('Helvetica-Bold').fontSize(8.5).text(`Nivel de riesgo: ${hallazgo.nivelRiesgo}`, this.left + 14, doc.y + 3);
      doc.fillColor(this.getHallazgoStatusColor(hallazgo.estado)).font('Helvetica-Bold').fontSize(8.5)
        .text(`Estado: ${this.getHallazgoStatusText(hallazgo.estado)}`, this.left + 14, doc.y + 3);
      doc.fillColor('#333').font('Helvetica').fontSize(9).text(`Ubicación: ${this.display(hallazgo.ubicacionTexto || 'No informada')}`, this.left + 14, doc.y + 3, { width: this.contentWidth - 14 });
      doc.text(`Descripción: ${this.display(hallazgo.descripcion)}`, this.left + 14, doc.y + 3, { width: this.contentWidth - 14, lineGap: 2 });
      if (hallazgo.descripcionSolucion) {
        const responsable = hallazgo.responsableResolucion
          ? ` — ${this.display(hallazgo.responsableResolucion.nombre)} ${this.display(hallazgo.responsableResolucion.apellido)}`
          : '';
        const fecha = hallazgo.fechaResolucion ? ` (${this.formatDate(hallazgo.fechaResolucion)})` : '';
        doc.font('Helvetica-Bold').text(`Resolución${fecha}${responsable}:`, this.left + 14, doc.y + 4, { width: this.contentWidth - 14 });
        doc.font('Helvetica').text(this.display(hallazgo.descripcionSolucion), this.left + 14, doc.y + 2, { width: this.contentWidth - 14, lineGap: 2 });
      }
      if (hallazgo.accionesCorrectivas.length > 0) {
        doc.font('Helvetica-Bold').text('Acciones correctivas vinculadas:', this.left + 14, doc.y + 4, { width: this.contentWidth - 14 });
        hallazgo.accionesCorrectivas.forEach((action) => {
          doc.font('Helvetica').text(`• ${this.display(action.descripcion)} (${this.display(action.estado)})`, this.left + 22, doc.y + 2, { width: this.contentWidth - 22, lineGap: 2 });
        });
      }
      doc.y += 7;
      doc.strokeColor(this.colors.lightGray).lineWidth(0.7).moveTo(this.left, doc.y).lineTo(this.right, doc.y).stroke();
      doc.moveDown(0.6);
    });
  }

  private addEvidence(doc: PdfDocument, data: InspeccionData) {
    if (!data.fotos?.length) return;
    // Keep the section heading with at least its first evidence block.
    this.ensureSpace(doc, 230, data);
    this.sectionTitle(doc, 'FOTOGRAFÍAS Y EVIDENCIAS');
    data.fotos.forEach((photo, index) => {
      this.ensureSpace(doc, 195, data);
      const context = [photo.titulo, photo.establecimiento ? `Establecimiento: ${photo.establecimiento}` : null, photo.sector ? `Sector: ${photo.sector}` : null]
        .filter(Boolean).map((value) => this.display(value as string)).join(' | ');
      doc.fillColor('#222').font('Helvetica-Bold').fontSize(9).text(`${index + 1}. ${context || 'Evidencia fotográfica'}`, { width: this.contentWidth });
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(8).text('Evidencia fotográfica incorporada', { width: this.contentWidth });
      const imageTop = doc.y + 5;
      try {
        doc.image(photo.buffer, this.left + 8, imageTop, { fit: [this.contentWidth - 16, 145], align: 'center', valign: 'center' });
      } catch {
        doc.fillColor(this.colors.warning).fontSize(8).text('La evidencia no pudo incrustarse en el PDF.', this.left + 8, imageTop + 60, { width: this.contentWidth - 16, align: 'center' });
      }
      doc.y = imageTop + 158;
      doc.moveDown(0.5);
    });
    if ((data.incidenciasFotografias || 0) > 0) {
      doc.fillColor(this.colors.warning).fontSize(8).text(`Advertencia: ${data.incidenciasFotografias} evidencia(s) no pudieron recuperarse o procesarse y fueron omitidas.`);
    }
  }

  private addSignature(doc: PdfDocument, data: InspeccionData) {
    this.ensureSpace(doc, 115, data);
    doc.moveDown(0.5).strokeColor(this.colors.lightGray).lineWidth(1).moveTo(this.left, doc.y).lineTo(this.right, doc.y).stroke().moveDown(0.8);
    const inspector = data.asignadoA ?? data.usuario;
    doc.fillColor('#222').font('Helvetica').fontSize(9).text('Inspección realizada por:', { align: 'center' }).moveDown(1.5)
      .text('________________________________________', { align: 'center' })
      .font('Helvetica-Bold').text(`${this.display(inspector.nombre)} ${this.display(inspector.apellido)}`, { align: 'center' })
      .font('Helvetica').fontSize(8).fillColor(this.colors.gray).text(this.display(inspector.email), { align: 'center' });
    doc.moveDown(0.5).fontSize(8).text(`Reporte generado el ${this.formatDate(new Date())}`, { align: 'center' });
  }

  private sectionTitle(doc: PdfDocument, title: string) {
    this.ensureSpace(doc, 42);
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(12).text(this.display(title), { underline: true }).moveDown(0.35);
  }

  private ensureSpace(doc: PdfDocument, height: number, data?: InspeccionData) {
    if (doc.y + height <= this.bottom) return;
    doc.addPage();
    if (data) this.addContinuationHeader(doc, data);
  }

  private addContinuationHeader(doc: PdfDocument, data: InspeccionData) {
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(9).text(this.display(data.organizacion?.nombre || 'SEH'), this.left, this.top, { width: 260, lineBreak: false });
    doc.fillColor(this.colors.gray).font('Helvetica').text('Reporte de inspección — continuación', this.left, this.top + 14, { width: 300, lineBreak: false });
    doc.strokeColor(this.colors.lightGray).lineWidth(0.7).moveTo(this.left, this.top + 30).lineTo(this.right, this.top + 30).stroke();
    doc.y = this.top + 45;
  }

  private addPageNumbers(doc: PdfDocument) {
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.strokeColor(this.colors.lightGray).lineWidth(0.5).moveTo(this.left, 765).lineTo(this.right, 765).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(this.colors.gray)
        .text('SEH — Reporte de inspección', this.left, 773, { width: 260, lineBreak: false })
        .text(`Página ${index + 1} de ${range.count}`, 347, 773, { width: 200, align: 'right', lineBreak: false });
    }
  }

  private async preparePhotos(photos: ReportPhoto[]) {
    const normalized: ReportPhoto[] = [];
    let incidencias = 0;
    for (const photo of photos) {
      try {
        const buffer = await sharp(photo.buffer, { limitInputPixels: 40_000_000, failOn: 'warning' }).rotate().png().toBuffer();
        normalized.push({ ...photo, buffer });
      } catch {
        incidencias += 1;
      }
    }
    return { fotos: normalized, incidencias };
  }

  /** Normaliza UTF-8 y repara sólo mojibake visible en la salida, nunca en la base. */
  private display(value: unknown): string {
    const original = String(value ?? '').normalize('NFC');
    if (!/[ÃÂâ]/.test(original)) return original;
    try {
      const repaired = Buffer.from(original, 'latin1').toString('utf8').normalize('NFC');
      const bad = (text: string) => (text.match(/[ÃÂâ�]/g) || []).length;
      if (!repaired.includes('�') && bad(repaired) < bad(original)) return repaired;
    } catch {
      // Leave the original text in place if it is not safely repairable.
    }
    return original;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private calcularDuracion(inicio?: Date | null, fin?: Date): string {
    if (!inicio) return 'No iniciada';
    if (!fin) return 'En progreso';
    const minutos = Math.max(0, Math.floor((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000));
    return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
  }

  private getStatusColor(cumplimiento: CumplimientoItem): string {
    switch (cumplimiento) {
      case 'CUMPLE': return this.colors.success;
      case 'NO_CUMPLE': return this.colors.danger;
      case 'NO_APLICA': return this.colors.gray;
      case 'OBSERVACION': return this.colors.warning;
      default: return this.colors.gray;
    }
  }

  private getStatusText(cumplimiento: CumplimientoItem): string {
    switch (cumplimiento) {
      case 'CUMPLE': return 'Cumple';
      case 'NO_CUMPLE': return 'No cumple';
      case 'NO_APLICA': return 'No aplica';
      case 'OBSERVACION': return 'Observación';
      default: return 'Pendiente';
    }
  }

  private getRiesgoColor(nivel: NivelRiesgo): string {
    switch (nivel) {
      case 'CRITICO': return '#9b1c1c';
      case 'ALTO': return this.colors.danger;
      case 'MEDIO': return this.colors.warning;
      case 'BAJO': return this.colors.success;
      default: return this.colors.gray;
    }
  }

  private getHallazgoStatusText(estado?: string): string {
    switch (estado) {
      case 'EN_CORRECCION': return 'En corrección';
      case 'SOLUCIONADO': return 'Solucionado';
      case 'PENDIENTE': return 'Pendiente';
      default: return this.display(estado || 'Pendiente');
    }
  }

  private getHallazgoStatusColor(estado?: string): string {
    switch (estado) {
      case 'SOLUCIONADO': return this.colors.success;
      case 'EN_CORRECCION': return this.colors.warning;
      case 'PENDIENTE': return this.colors.danger;
      default: return this.colors.gray;
    }
  }
}
