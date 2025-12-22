import * as PDFDocument from 'pdfkit';
import { CumplimientoItem, NivelRiesgo } from '@prisma/client';

interface InspeccionData {
  id: string;
  sector: string;
  descripcion?: string | null;
  fechaHoraInicio: Date;
  fechaHoraFin?: Date | null;
  observaciones?: string | null;
  checklist: {
    nombre: string;
    tipo: string;
  };
  usuario: {
    nombre: string;
    apellido: string;
    email: string;
  };
  empresa?: {
    nombre: string;
    logoUrl?: string | null;
  };
  items: Array<{
    cumplimiento: CumplimientoItem;
    observacion?: string | null;
    checklistItem: {
      descripcion: string;
      orden: number;
    };
  }>;
  hallazgos: Array<{
    titulo: string;
    descripcion: string;
    nivelRiesgo: NivelRiesgo;
    ubicacionTexto?: string | null;
    fotosUrls?: string | null;
    accionesCorrectivas: Array<{
      descripcion: string;
      estado: string;
    }>;
  }>;
}

export class PDFInspeccionGenerator {
  private doc: typeof PDFDocument;
  private colors = {
    primary: '#1976d2',
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    gray: '#757575',
    lightGray: '#e0e0e0',
  };

  async generate(inspeccion: InspeccionData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Reporte de Inspección - ${inspeccion.sector}`,
            Author: `${inspeccion.usuario.nombre} ${inspeccion.usuario.apellido}`,
            Subject: 'Reporte de Inspección de Seguridad e Higiene',
          },
        });

        const chunks: Buffer[] = [];

        this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        this.doc.on('end', () => resolve(Buffer.concat(chunks)));
        this.doc.on('error', reject);

        // Generar contenido
        this.addHeader(inspeccion);
        this.addDatosGenerales(inspeccion);
        this.addChecklist(inspeccion);
        this.addHallazgos(inspeccion);
        this.addFooter(inspeccion);

        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(inspeccion: InspeccionData) {
    // Título
    this.doc
      .fillColor(this.colors.primary)
      .fontSize(24)
      .text('REPORTE DE INSPECCIÓN', { align: 'center' })
      .moveDown(0.5);

    // Subtítulo
    this.doc
      .fillColor(this.colors.gray)
      .fontSize(12)
      .text('Sistema de Seguridad e Higiene', { align: 'center' })
      .moveDown(1);

    // Línea divisoria
    this.doc
      .strokeColor(this.colors.primary)
      .lineWidth(2)
      .moveTo(50, this.doc.y)
      .lineTo(545, this.doc.y)
      .stroke()
      .moveDown(1);
  }

  private addDatosGenerales(inspeccion: InspeccionData) {
    this.doc
      .fillColor(this.colors.primary)
      .fontSize(14)
      .text('DATOS GENERALES', { underline: true })
      .moveDown(0.5);

    this.doc.fillColor('black').fontSize(10);

    const datos = [
      ['Checklist:', inspeccion.checklist.nombre],
      ['Tipo:', inspeccion.checklist.tipo],
      ['Sector:', inspeccion.sector],
      ['Técnico:', `${inspeccion.usuario.nombre} ${inspeccion.usuario.apellido}`],
      ['Fecha Inicio:', this.formatDate(inspeccion.fechaHoraInicio)],
      ['Fecha Fin:', inspeccion.fechaHoraFin ? this.formatDate(inspeccion.fechaHoraFin) : '-'],
      ['Duración:', this.calcularDuracion(inspeccion.fechaHoraInicio, inspeccion.fechaHoraFin ?? undefined)],
    ];

    datos.forEach(([label, value]) => {
      this.doc.font('Helvetica-Bold').text(label, { continued: true });
      this.doc.font('Helvetica').text(` ${value}`);
    });

    this.doc.moveDown(1);
  }

  private addChecklist(inspeccion: InspeccionData) {
    this.doc
      .fillColor(this.colors.primary)
      .fontSize(14)
      .text('RESULTADOS DEL CHECKLIST', { underline: true })
      .moveDown(0.5);

    // Resumen
    const cumplen = inspeccion.items.filter((i) => i.cumplimiento === 'CUMPLE').length;
    const noCumplen = inspeccion.items.filter((i) => i.cumplimiento === 'NO_CUMPLE').length;
    const noAplica = inspeccion.items.filter((i) => i.cumplimiento === 'NO_APLICA').length;
    const observacion = inspeccion.items.filter((i) => i.cumplimiento === 'OBSERVACION').length;

    this.doc.fillColor('black').fontSize(10);
    this.doc.text(
      `Resumen: ${cumplen} cumplen | ${noCumplen} no cumplen | ${noAplica} no aplica | ${observacion} observaciones`,
    );
    this.doc.moveDown(0.5);

    // Tabla de items
    const tableTop = this.doc.y;
    const itemHeight = 25;

    // Headers
    this.doc
      .fillColor('white')
      .rect(50, tableTop, 495, 20)
      .fill(this.colors.primary);

    this.doc
      .fillColor('white')
      .fontSize(9)
      .text('Item', 55, tableTop + 6, { width: 300 })
      .text('Estado', 360, tableTop + 6, { width: 80 })
      .text('Observación', 445, tableTop + 6, { width: 100 });

    let y = tableTop + 20;

    inspeccion.items.forEach((item, index) => {
      if (y > 700) {
        this.doc.addPage();
        y = 50;
      }

      const bgColor = index % 2 === 0 ? '#f5f5f5' : 'white';
      this.doc.rect(50, y, 495, itemHeight).fill(bgColor);

      const statusColor = this.getStatusColor(item.cumplimiento);
      const statusText = this.getStatusText(item.cumplimiento);

      this.doc
        .fillColor('black')
        .fontSize(8)
        .text(item.checklistItem.descripcion, 55, y + 8, { width: 300 });

      this.doc.fillColor(statusColor).text(statusText, 360, y + 8, { width: 80 });

      this.doc
        .fillColor('black')
        .text(item.observacion || '-', 445, y + 8, { width: 100 });

      y += itemHeight;
    });

    this.doc.y = y + 10;
    this.doc.moveDown(1);
  }

  private addHallazgos(inspeccion: InspeccionData) {
    if (inspeccion.hallazgos.length === 0) {
      this.doc
        .fillColor(this.colors.success)
        .fontSize(12)
        .text('No se detectaron hallazgos durante esta inspección.', { align: 'center' })
        .moveDown(1);
      return;
    }

    if (this.doc.y > 650) {
      this.doc.addPage();
    }

    this.doc
      .fillColor(this.colors.primary)
      .fontSize(14)
      .text('HALLAZGOS DETECTADOS', { underline: true })
      .moveDown(0.5);

    this.doc
      .fillColor('black')
      .fontSize(10)
      .text(`Total: ${inspeccion.hallazgos.length} hallazgo(s)`)
      .moveDown(0.5);

    inspeccion.hallazgos.forEach((hallazgo, index) => {
      if (this.doc.y > 650) {
        this.doc.addPage();
      }

      const riesgoColor = this.getRiesgoColor(hallazgo.nivelRiesgo);

      // Box del hallazgo
      this.doc
        .rect(50, this.doc.y, 495, 5)
        .fill(riesgoColor);

      this.doc.moveDown(0.3);

      this.doc
        .fillColor('black')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${hallazgo.titulo}`)
        .font('Helvetica');

      this.doc.fontSize(9);
      this.doc.text(`Nivel de Riesgo: `, { continued: true });
      this.doc.fillColor(riesgoColor).text(hallazgo.nivelRiesgo);
      this.doc.fillColor('black');

      this.doc.text(`Ubicación: ${hallazgo.ubicacionTexto}`);
      this.doc.text(`Descripción: ${hallazgo.descripcion}`);

      if (hallazgo.accionesCorrectivas.length > 0) {
        this.doc.text('Acciones Correctivas:');
        hallazgo.accionesCorrectivas.forEach((ac) => {
          this.doc.text(`  • ${ac.descripcion} (${ac.estado})`);
        });
      }

      this.doc.moveDown(1);
    });
  }

  private addFooter(inspeccion: InspeccionData) {
    if (this.doc.y > 700) {
      this.doc.addPage();
    }

    this.doc.moveDown(2);

    // Línea divisoria
    this.doc
      .strokeColor(this.colors.lightGray)
      .lineWidth(1)
      .moveTo(50, this.doc.y)
      .lineTo(545, this.doc.y)
      .stroke()
      .moveDown(1);

    // Firma
    this.doc
      .fillColor('black')
      .fontSize(10)
      .text('Inspección realizada por:', { align: 'center' })
      .moveDown(2)
      .text('_______________________________', { align: 'center' })
      .text(`${inspeccion.usuario.nombre} ${inspeccion.usuario.apellido}`, { align: 'center' })
      .fontSize(8)
      .fillColor(this.colors.gray)
      .text(inspeccion.usuario.email, { align: 'center' })
      .moveDown(1);

    // Fecha de generación
    this.doc
      .fontSize(8)
      .text(`Reporte generado el ${this.formatDate(new Date())}`, { align: 'center' });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private calcularDuracion(inicio: Date, fin?: Date): string {
    if (!fin) return 'En progreso';
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}min`;
  }

  private getStatusColor(cumplimiento: CumplimientoItem): string {
    switch (cumplimiento) {
      case 'CUMPLE':
        return this.colors.success;
      case 'NO_CUMPLE':
        return this.colors.danger;
      case 'NO_APLICA':
        return this.colors.gray;
      case 'OBSERVACION':
        return this.colors.warning;
      default:
        return 'black';
    }
  }

  private getStatusText(cumplimiento: CumplimientoItem): string {
    switch (cumplimiento) {
      case 'CUMPLE':
        return 'Cumple';
      case 'NO_CUMPLE':
        return 'No Cumple';
      case 'NO_APLICA':
        return 'N/A';
      case 'OBSERVACION':
        return 'Observación';
      default:
        return cumplimiento;
    }
  }

  private getRiesgoColor(nivel: NivelRiesgo): string {
    switch (nivel) {
      case 'CRITICO':
        return '#b71c1c';
      case 'ALTO':
        return this.colors.danger;
      case 'MEDIO':
        return this.colors.warning;
      case 'BAJO':
        return this.colors.success;
      default:
        return this.colors.gray;
    }
  }
}
