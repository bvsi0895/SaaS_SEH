import * as PDFDocument from 'pdfkit';
const sharp = require('sharp') as any;

export interface ReporteMensualData {
  organizacion: { nombre: string; logoUrl?: string | null; emailContacto?: string | null; telefono?: string | null; direccion?: string | null };
  empresa: { nombre: string; cuit?: string | null };
  establecimientos: Array<{ nombre: string; direccion?: string | null }>;
  periodo: { desde: Date; hasta: Date };
  fechaCorte?: Date;
  responsable: { nombre: string; apellido: string; email: string; identificacionProfesional?: string | null };
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
    descripcion: string;
    nivel: string;
    estado?: string;
    ubicacion?: string | null;
    fechaResolucion?: Date | null;
    descripcionSolucion?: string | null;
    responsableResolucion?: string | null;
    establecimiento?: string | null;
    sector?: string | null;
    fecha: Date;
  }>;
  acciones: Array<{ descripcion: string; estado: string; fechaCompromiso: Date; establecimiento?: string | null }>;
  fotos: Array<{
    buffer: Buffer;
    nombre: string;
    titulo?: string;
    descripcion?: string | null;
    hallazgoId?: string | null;
    hallazgoTitulo?: string | null;
    sector?: string | null;
    establecimiento?: string | null;
    fecha?: Date;
  }>;
  incidenciasFotografias: number;
  logo?: Buffer | null;
  incidenciaLogo?: string;
}

type PdfDocument = PDFKit.PDFDocument;

export class PDFMensualGenerator {
  private readonly colors = {
    primary: '#1f5f8b',
    primaryBlue: '#1976d2',
    ink: '#222222',
    gray: '#5f6b76',
    paleBlue: '#eef5fa',
    border: '#d9e2ea',
    risk: {
      CRITICO: { foreground: '#b42318', background: '#fde8e7' },
      ALTO: { foreground: '#c75b00', background: '#fff0df' },
      MEDIO: { foreground: '#9a6700', background: '#fff7d6' },
      BAJO: { foreground: '#2e7d32', background: '#e8f5e9' },
    },
  } as const;

  private readonly left = 48;
  private readonly right = 547;
  private readonly contentWidth = 499;
  private readonly top = 48;
  private readonly bottom = 748;

  async generate(data: ReporteMensualData): Promise<Buffer> {
    this.assertConsistentCounts(data);
    const normalizedPhotos = await this.preparePhotos(data.fotos);
    const preparedData: ReporteMensualData = {
      ...data,
      fotos: normalizedPhotos.fotos,
      incidenciasFotografias: data.incidenciasFotografias + normalizedPhotos.incidencias,
    };

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: this.left,
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

      try {
        this.addHeader(doc, preparedData);
        this.addGeneralData(doc, preparedData);
        this.addExecutiveSummary(doc, preparedData);
        this.addInspections(doc, preparedData);
        this.addRiskSummary(doc, preparedData);
        this.addFindings(doc, preparedData);
        this.addCorrectiveActions(doc, preparedData);
        this.addEvidence(doc, preparedData);
        this.addResponsible(doc, preparedData);
        this.addPageNumbers(doc, preparedData);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private assertConsistentCounts(data: ReporteMensualData) {
    const inspectionFindings = data.inspecciones.reduce((total, inspection) => total + inspection.hallazgos, 0);
    if (inspectionFindings !== data.hallazgos.length) {
      throw new Error(`Datos inconsistentes: las inspecciones informan ${inspectionFindings} hallazgo(s), pero el detalle contiene ${data.hallazgos.length}.`);
    }
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

  private addHeader(doc: PdfDocument, data: ReporteMensualData) {
    if (data.logo) {
      try {
        doc.image(data.logo, this.left, this.top, { fit: [92, 54], valign: 'center' });
      } catch {
        this.addFallbackLogo(doc);
      }
    } else {
      this.addFallbackLogo(doc);
    }

    const organization = this.display(data.organizacion.nombre || 'Sistema de Seguridad e Higiene');
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(16)
      .text(organization, this.left + 105, this.top + 3, { width: this.contentWidth - 105 });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9)
      .text('Seguridad e Higiene | Informe institucional mensual', this.left + 105, this.top + 26, { width: this.contentWidth - 105 });
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(18)
      .text('INFORME MENSUAL DE SEGURIDAD E HIGIENE', this.left, this.top + 76, { width: this.contentWidth, align: 'center' });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(10)
      .text(`Período ${this.date(data.periodo.desde)} al ${this.date(data.periodo.hasta)}`, this.left, this.top + 101, { width: this.contentWidth, align: 'center' });
    doc.strokeColor(this.colors.primaryBlue).lineWidth(2)
      .moveTo(this.left, this.top + 125).lineTo(this.right, this.top + 125).stroke();
    doc.y = this.top + 143;
  }

  private addFallbackLogo(doc: PdfDocument) {
    doc.roundedRect(this.left, this.top + 4, 82, 42, 5).fill(this.colors.primary);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18)
      .text('SEH', this.left, this.top + 15, { width: 82, align: 'center' });
  }

  private addGeneralData(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'DATOS GENERALES', data, 190);
    const establishmentText = data.establecimientos.length > 0
      ? data.establecimientos.map((item) => item.direccion ? `${item.nombre} (${item.direccion})` : item.nombre).join(', ')
      : 'Todos los establecimientos autorizados';
    const rows: Array<[string, string]> = [
      ['Consultora', data.organizacion.nombre],
      ['Empresa', data.empresa.nombre],
      ['CUIT', data.empresa.cuit || 'No informado'],
      ['Período', `${this.date(data.periodo.desde)} al ${this.date(data.periodo.hasta)}`],
      ['Fecha de corte', this.date(data.fechaCorte || data.periodo.hasta)],
      ['Establecimientos', establishmentText],
    ];
    this.drawKeyValueTable(doc, rows, data);
  }

  private addExecutiveSummary(doc: PdfDocument, data: ReporteMensualData) {
    const preparedData = data;
    this.sectionTitle(doc, 'RESUMEN EJECUTIVO', data, 150);
    this.ensureSpace(doc, 86, data);
    const metrics = [
      { label: 'Inspecciones', value: data.inspecciones.length, color: this.colors.primary },
      { label: 'Hallazgos', value: data.hallazgos.length, color: '#b26a00' },
      { label: 'Acciones', value: data.acciones.length, color: '#6a4c93' },
      { label: 'Evidencias', value: data.fotos.length, color: '#2e7d32' },
    ];
    const gap = 8;
    const cardWidth = (this.contentWidth - gap * (metrics.length - 1)) / metrics.length;
    const cardY = doc.y;
    metrics.forEach((metric, index) => {
      const x = this.left + index * (cardWidth + gap);
      doc.roundedRect(x, cardY, cardWidth, 67, 4).fill(this.colors.paleBlue);
      doc.rect(x, cardY, cardWidth, 5).fill(metric.color);
      doc.fillColor(metric.color).font('Helvetica-Bold').fontSize(22)
        .text(String(metric.value), x + 8, cardY + 16, { width: cardWidth - 16, align: 'center' });
      doc.fillColor(this.colors.gray).font('Helvetica-Bold').fontSize(8.5)
        .text(metric.label, x + 5, cardY + 47, { width: cardWidth - 10, align: 'center' });
    });
    doc.x = this.left;
    doc.y = cardY + 80;
    doc.fillColor(this.colors.ink).font('Helvetica').fontSize(9.5)
      .text(`En el período informado se realizaron ${preparedData.inspecciones.length} inspección(es), se registraron ${preparedData.hallazgos.length} hallazgo(s) y ${preparedData.acciones.length} acción(es) correctiva(s). Se incrustaron ${preparedData.fotos.length} evidencia(s) fotográfica(s) real(es).`, { lineGap: 3 });
    if (data.incidenciasFotografias > 0) {
      doc.moveDown(0.35).fillColor('#9a6700').fontSize(8.5)
        .text(`Advertencia: ${data.incidenciasFotografias} evidencia(s) no pudieron recuperarse o procesarse y fueron omitidas.`);
    }
    doc.moveDown(0.7);
  }

  private addInspections(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'INSPECCIONES REALIZADAS', data, data.inspecciones.length > 0 ? 105 : 58);
    if (data.inspecciones.length === 0) {
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9.5)
        .text('No se registraron inspecciones en el período seleccionado.');
      return;
    }
    this.drawInspectionTable(doc, data.inspecciones, data);
  }

  private addRiskSummary(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'HALLAZGOS POR RIESGO', data, 90);
    this.ensureSpace(doc, 78, data);
    const risks = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];
    const gap = 8;
    const cardWidth = (this.contentWidth - gap * (risks.length - 1)) / risks.length;
    const cardY = doc.y;
    risks.forEach((risk, index) => {
      const palette = this.riskPalette(risk);
      const count = data.hallazgos.filter((item) => this.normalizeRisk(item.nivel) === risk).length;
      const x = this.left + index * (cardWidth + gap);
      doc.roundedRect(x, cardY, cardWidth, 60, 4).fill(palette.background);
      doc.fillColor(palette.foreground).font('Helvetica-Bold').fontSize(18)
        .text(String(count), x + 8, cardY + 10, { width: cardWidth - 16, align: 'center' });
      doc.fontSize(8).text(this.riskLabel(risk), x + 5, cardY + 38, { width: cardWidth - 10, align: 'center' });
    });
    doc.y = cardY + 72;
  }

  private addFindings(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'HALLAZGOS DETALLADOS', data, data.hallazgos.length > 0 ? 135 : 58);
    if (data.hallazgos.length === 0) {
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9.5)
        .text('No se registraron hallazgos en el período seleccionado.');
      return;
    }
    data.hallazgos.forEach((finding, index) => this.drawFinding(doc, finding, index, data));
  }

  private addCorrectiveActions(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'ACCIONES CORRECTIVAS', data, data.acciones.length > 0 ? 105 : 58);
    const states = ['PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'VENCIDA'];
    this.ensureSpace(doc, 58, data);
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(8.5)
      .text(states.map((state) => `${this.actionState(state)}: ${data.acciones.filter((item) => item.estado === state).length}`).join('   '));
    doc.moveDown(0.55);
    if (data.acciones.length === 0) {
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9.5)
        .text('No se registraron acciones correctivas en el período seleccionado.');
      return;
    }
    this.drawActionsTable(doc, data.acciones, data);
  }

  private addEvidence(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'EVIDENCIAS FOTOGRÁFICAS', data, data.fotos.length > 0 ? 270 : 58);
    if (data.fotos.length === 0) {
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9.5)
        .text('No hay fotografías disponibles para este período.');
      return;
    }
    data.fotos.forEach((photo, index) => {
      const title = photo.hallazgoTitulo ? 'Evidencia fotográfica' : (photo.titulo || 'Evidencia fotográfica');
      const meta = [
        photo.hallazgoTitulo ? `Hallazgo: ${photo.hallazgoTitulo}` : null,
        photo.establecimiento ? `Establecimiento: ${photo.establecimiento}` : null,
        photo.sector ? `Sector: ${photo.sector}` : null,
        photo.fecha ? this.date(photo.fecha) : null,
      ].filter(Boolean).join(' | ');
      const description = photo.descripcion || 'Evidencia fotográfica incorporada';
      const textHeight = this.measure(doc, `${index + 1}. ${title}`, this.contentWidth - 12, 9, true)
        + this.measure(doc, meta || 'Evidencia fotográfica', this.contentWidth - 12, 8, false)
        + this.measure(doc, description, this.contentWidth - 12, 8, false);
      this.ensureSpace(doc, Math.max(240, textHeight + 220), data, 'EVIDENCIAS FOTOGRÁFICAS');
      const top = doc.y;
      doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(9)
        .text(`${index + 1}. ${title}`, this.left, top, { width: this.contentWidth - 12 });
      doc.fillColor(this.colors.gray).font('Helvetica').fontSize(8)
        .text(meta || 'Evidencia fotográfica', this.left, doc.y + 2, { width: this.contentWidth - 12 });
      doc.text(description, this.left, doc.y + 2, { width: this.contentWidth - 12 });
      const imageTop = doc.y + 8;
      doc.strokeColor(this.colors.border).lineWidth(0.7)
        .rect(this.left, imageTop, this.contentWidth, 190).stroke();
      doc.image(photo.buffer, this.left + 8, imageTop + 8, {
        fit: [this.contentWidth - 16, 174],
        align: 'center',
        valign: 'center',
      });
      doc.y = imageTop + 203;
      doc.moveDown(0.35);
    });
  }

  private addResponsible(doc: PdfDocument, data: ReporteMensualData) {
    this.sectionTitle(doc, 'RESPONSABLE TÉCNICO', data, 145);
    this.ensureSpace(doc, 145, data);
    const responsible = `${data.responsable.nombre} ${data.responsable.apellido}`.trim();
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(9).text('Informe elaborado por:', { align: 'center' });
    doc.moveDown(2.1);
    doc.strokeColor('#777').lineWidth(0.7)
      .moveTo(this.left + 150, doc.y).lineTo(this.right - 150, doc.y).stroke();
    doc.moveDown(0.15);
    doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(10).text(responsible || 'Responsable no informado', { align: 'center' });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(8.5).text(data.responsable.email || 'Email no informado', { align: 'center' });
    doc.text(`Identificación profesional: ${data.responsable.identificacionProfesional || 'No registrada'}`, { align: 'center' });
    if (data.incidenciaLogo) {
      doc.moveDown(0.5).fillColor('#9a6700').fontSize(8).text(`Advertencia de identidad: ${data.incidenciaLogo}`, { align: 'center' });
    }
  }

  private drawKeyValueTable(doc: PdfDocument, rows: Array<[string, string]>, data: ReporteMensualData) {
    const labelWidth = 125;
    const valueWidth = this.contentWidth - labelWidth - 16;
    rows.forEach(([label, value], index) => {
      const labelHeight = this.measure(doc, `${label}:`, labelWidth - 16, 9, true);
      const valueHeight = this.measure(doc, this.display(value), valueWidth, 9, false);
      const height = Math.max(23, labelHeight, valueHeight) + 8;
      this.ensureSpace(doc, height + 2, data, 'DATOS GENERALES');
      const rowY = doc.y;
      if (index % 2 === 0) doc.rect(this.left, rowY - 2, this.contentWidth, height).fill(this.colors.paleBlue);
      doc.fillColor(this.colors.gray).font('Helvetica-Bold').fontSize(9)
        .text(`${this.display(label)}:`, this.left + 9, rowY + 4, { width: labelWidth - 16, lineGap: 2 });
      doc.fillColor(this.colors.ink).font('Helvetica').fontSize(9)
        .text(this.display(value), this.left + labelWidth, rowY + 4, { width: valueWidth, lineGap: 2 });
      doc.x = this.left;
      doc.y = rowY + height;
    });
    doc.moveDown(0.7);
  }

  private drawInspectionTable(doc: PdfDocument, inspections: ReporteMensualData['inspecciones'], data: ReporteMensualData) {
    const columns = [
      { label: 'Fecha', width: 58 },
      { label: 'Establecimiento / checklist', width: 128 },
      { label: 'Sector', width: 96 },
      { label: 'Técnico', width: 153 },
      { label: 'Hallazgos', width: 64 },
    ];
    this.drawTableHeader(doc, columns);
    inspections.forEach((item, index) => {
      const establishment = `${item.establecimiento || 'Sin establecimiento'}\n${item.checklist}`;
      const values = [this.date(item.fecha), establishment, item.sector, item.tecnico, String(item.hallazgos)];
      const height = Math.max(...values.map((value, columnIndex) => this.measure(doc, value, columns[columnIndex].width - 12, 8, columnIndex === 1))) + 12;
      if (doc.y + height > this.bottom) {
        this.continueTable(doc, data, 'INSPECCIONES REALIZADAS');
        this.drawTableHeader(doc, columns);
      }
      this.drawTableRow(doc, columns, values, index % 2 === 0, height, [false, false, false, false, true]);
    });
    doc.moveDown(0.7);
  }

  private drawActionsTable(doc: PdfDocument, actions: ReporteMensualData['acciones'], data: ReporteMensualData) {
    const columns = [
      { label: 'Estado', width: 85 },
      { label: 'Detalle de la acción', width: 236 },
      { label: 'Compromiso', width: 82 },
      { label: 'Establecimiento', width: 96 },
    ];
    this.drawTableHeader(doc, columns);
    actions.forEach((action, index) => {
      const descriptionFragments = this.splitTextByHeight(doc, action.descripcion, columns[1].width - 12, 8.2, 560);
      descriptionFragments.forEach((description, fragmentIndex) => {
        const values = [
          fragmentIndex === 0 ? this.actionState(action.estado) : '',
          description,
          fragmentIndex === 0 ? this.date(action.fechaCompromiso) : '',
          fragmentIndex === 0 ? (action.establecimiento || 'Sin establecimiento') : '',
        ];
        const height = Math.max(...values.map((value, columnIndex) => this.measure(doc, value, columns[columnIndex].width - 12, 8.2, columnIndex === 1))) + 12;
        if (doc.y + height > this.bottom) {
          this.continueTable(doc, data, 'ACCIONES CORRECTIVAS');
          this.drawTableHeader(doc, columns);
        }
        this.drawTableRow(doc, columns, values, index % 2 === 0, height, [false, false, false, false]);
      });
    });
    doc.moveDown(0.7);
  }

  private drawTableHeader(doc: PdfDocument, columns: Array<{ label: string; width: number }>) {
    const y = doc.y;
    doc.rect(this.left, y, this.contentWidth, 27).fill(this.colors.primary);
    let x = this.left;
    columns.forEach((column) => {
      doc.fillColor('white').font('Helvetica-Bold').fontSize(8.2)
        .text(column.label, x + 6, y + 8, { width: column.width - 12, lineBreak: false });
      x += column.width;
    });
    doc.y = y + 27;
  }

  private drawTableRow(doc: PdfDocument, columns: Array<{ label: string; width: number }>, values: string[], shaded: boolean, height: number, centered: boolean[]) {
    const y = doc.y;
    if (shaded) doc.rect(this.left, y, this.contentWidth, height).fill('#f7fafc');
    doc.strokeColor(this.colors.border).lineWidth(0.55).rect(this.left, y, this.contentWidth, height).stroke();
    let x = this.left;
    values.forEach((value, index) => {
      doc.fillColor(this.colors.ink).font('Helvetica').fontSize(8.2)
        .text(this.display(value), x + 6, y + 6, { width: columns[index].width - 12, align: centered[index] ? 'center' : 'left', lineGap: 2 });
      x += columns[index].width;
    });
    doc.y = y + height;
  }

  private splitTextByHeight(doc: PdfDocument, value: string, width: number, fontSize: number, maxHeight: number): string[] {
    const words = this.display(value).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const fragments: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.measure(doc, candidate, width, fontSize, false) <= maxHeight) {
        current = candidate;
        continue;
      }
      if (current) fragments.push(current);
      const pieces = this.splitTokenByHeight(doc, word, width, fontSize, maxHeight);
      fragments.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1];
    }
    if (current) fragments.push(current);
    return fragments;
  }

  private splitTokenByHeight(doc: PdfDocument, token: string, width: number, fontSize: number, maxHeight: number): string[] {
    const pieces: string[] = [];
    let remaining = token;
    while (remaining.length > 0) {
      let low = 1;
      let high = remaining.length;
      let best = 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (this.measure(doc, remaining.slice(0, middle), width, fontSize, false) <= maxHeight) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      pieces.push(remaining.slice(0, best));
      remaining = remaining.slice(best);
    }
    return pieces;
  }

  private drawFinding(doc: PdfDocument, finding: ReporteMensualData['hallazgos'][number], index: number, data: ReporteMensualData) {
    const risk = this.normalizeRisk(finding.nivel);
    const palette = this.riskPalette(risk);
    const width = this.contentWidth - 18;
    const title = `${index + 1}. ${finding.titulo}`;
    const lifecycleLabel = `estado: ${this.hallazgoState(finding.estado)}`;
    const meta = `Riesgo: ${this.riskLabel(risk)}   |   ${lifecycleLabel.replace(/^estado:/, 'Estado:')}`;
    const location = `Ubicación: ${finding.ubicacion || finding.sector || finding.establecimiento || 'No informada'}`;
    const date = `Fecha: ${this.date(finding.fecha)}${finding.establecimiento ? `   |   Establecimiento: ${finding.establecimiento}` : ''}${finding.sector ? `   |   Sector: ${finding.sector}` : ''}`;
    const resolution = finding.descripcionSolucion
      ? `Resolución: ${finding.descripcionSolucion}${finding.fechaResolucion ? ` (${this.date(finding.fechaResolucion)})` : ''}${finding.responsableResolucion ? ` - Responsable: ${finding.responsableResolucion}` : ''}`
      : '';
    const height = this.measure(doc, title, width, 10.5, true)
      + this.measure(doc, meta, width, 8.5, true)
      + this.measure(doc, location, width, 8.5, false)
      + this.measure(doc, date, width, 8.5, false)
      + this.measure(doc, `Descripción: ${finding.descripcion || 'No informada'}`, width, 8.7, false)
      + (resolution ? this.measure(doc, resolution, width, 8.7, false) : 0) + 31;
    this.ensureSpace(doc, Math.min(height, this.bottom - this.top), data, 'HALLAZGOS DETALLADOS');
    const top = doc.y;
    doc.rect(this.left, top, 6, Math.max(35, height - 8)).fill(palette.foreground);
    doc.fillColor(this.colors.ink).font('Helvetica-Bold').fontSize(10.5)
      .text(title, this.left + 14, top, { width, lineGap: 2 });
    doc.fillColor(palette.foreground).font('Helvetica-Bold').fontSize(8.5)
      .text(meta, this.left + 14, doc.y + 3, { width, lineGap: 2 });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(8.5)
      .text(location, this.left + 14, doc.y + 3, { width, lineGap: 2 })
      .text(date, this.left + 14, doc.y + 3, { width, lineGap: 2 })
      .text(`Descripción: ${finding.descripcion || 'No informada'}`, this.left + 14, doc.y + 3, { width, lineGap: 2 });
    if (resolution) {
      doc.fillColor(this.colors.ink).font('Helvetica').fontSize(8.5)
        .text(resolution, this.left + 14, doc.y + 3, { width, lineGap: 2 });
    }
    const bottom = doc.y + 8;
    doc.strokeColor(this.colors.border).lineWidth(0.6).moveTo(this.left, bottom).lineTo(this.right, bottom).stroke();
    doc.y = bottom + 9;
  }

  private sectionTitle(doc: PdfDocument, title: string, data: ReporteMensualData, minimumContentHeight = 58) {
    this.ensureSpace(doc, minimumContentHeight, data);
    doc.fillColor(this.colors.primaryBlue).font('Helvetica-Bold').fontSize(13)
      .text(title, this.left, doc.y, { underline: true });
    doc.font('Helvetica').moveDown(0.45);
  }

  private continueTable(doc: PdfDocument, data: ReporteMensualData, title: string) {
    doc.addPage();
    this.addContinuationHeader(doc, data);
    doc.y = this.top + 75;
    doc.fillColor(this.colors.primaryBlue).font('Helvetica-Bold').fontSize(11)
      .text(title, this.left, doc.y, { underline: true });
    doc.moveDown(0.35);
  }

  private ensureSpace(doc: PdfDocument, height: number, data: ReporteMensualData, continuationTitle?: string) {
    if (doc.y + height <= this.bottom) return;
    doc.addPage();
    this.addContinuationHeader(doc, data);
    doc.y = this.top + 75;
    if (continuationTitle) {
      doc.fillColor(this.colors.primaryBlue).font('Helvetica-Bold').fontSize(11)
        .text(continuationTitle, this.left, doc.y, { underline: true });
      doc.moveDown(0.35);
    }
  }

  private addContinuationHeader(doc: PdfDocument, data: ReporteMensualData) {
    doc.fillColor(this.colors.primary).font('Helvetica-Bold').fontSize(10)
      .text(this.display(data.organizacion.nombre), this.left, this.top, { width: this.contentWidth });
    doc.fillColor(this.colors.gray).font('Helvetica').fontSize(8.5)
      .text('Informe mensual - continuación', this.left, this.top + 17, { width: this.contentWidth });
    doc.strokeColor(this.colors.border).lineWidth(0.7)
      .moveTo(this.left, this.top + 41).lineTo(this.right, this.top + 41).stroke();
  }

  private addPageNumbers(doc: PdfDocument, data: ReporteMensualData) {
    const range = doc.bufferedPageRange();
    const period = `${this.date(data.periodo.desde)} - ${this.date(data.periodo.hasta)}`;
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.strokeColor(this.colors.border).lineWidth(0.5)
        .moveTo(this.left, 765).lineTo(this.right, 765).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(this.colors.gray)
        .text(`SEH - Informe mensual | ${period}`, this.left, 773, { width: 350, lineBreak: false })
        .text(`Página ${index + 1} de ${range.count}`, 398, 773, { width: 149, align: 'right', lineBreak: false });
    }
  }

  private measure(doc: PdfDocument, value: string, width: number, fontSize: number, bold: boolean): number {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    return doc.heightOfString(this.display(value), { width, lineGap: 2 });
  }

  private riskPalette(risk: string) {
    return this.colors.risk[risk as keyof typeof this.colors.risk] || this.colors.risk.MEDIO;
  }

  private normalizeRisk(value: string): string {
    const normalized = this.display(value).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'].includes(normalized) ? normalized : 'MEDIO';
  }

  private riskLabel(value: string): string {
    return value === 'CRITICO' ? 'CRÍTICO' : value;
  }

  private actionState(value: string): string {
    switch (value) {
      case 'EN_PROGRESO': return 'En progreso';
      case 'RESUELTA': return 'Resuelta';
      case 'VENCIDA': return 'Vencida';
      case 'PENDIENTE': return 'Pendiente';
      default: return value || 'No informado';
    }
  }

  private hallazgoState(value?: string): string {
    switch (value) {
      case 'EN_CORRECCION': return 'En corrección';
      case 'SOLUCIONADO': return 'Solucionado';
      case 'PENDIENTE': return 'Pendiente';
      default: return value || 'Pendiente';
    }
  }

  private date(value: Date): string {
    const date = new Date(value);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  }

  private display(value: unknown): string {
    return String(value ?? '').replace(/\u2011/g, '-');
  }
}

