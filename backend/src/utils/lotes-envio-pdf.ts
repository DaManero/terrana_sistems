import PDFDocument from 'pdfkit';

interface LotePdfVenta {
  numero_pedido: string;
  cliente: { nombre: string; apellido: string } | null;
  guest_nombre?: string | null;
  direccion?: {
    calle?: string | null;
    piso_depto?: string | null;
    localidad?: string | null;
    provincia?: string | null;
    codigo_postal?: string | null;
    pais?: string | null;
  } | null;
  domicilio_envio?: string | null;
  items: Array<{
    cantidad: number;
    producto: { nombre: string };
  }>;
}

interface LotePdfData {
  numero: string;
  created_at: Date | string;
  metodo_envio: { nombre: string };
  generador?: { nombre: string; apellido: string } | null;
  ventas: LotePdfVenta[];
}

const LABEL_COLUMNS = 2;
const LABEL_ROWS = 3;
const LABELS_PER_PAGE = LABEL_COLUMNS * LABEL_ROWS;

function drawCutMarks(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  const mark = 10;
  const color = '#B8B1A1';

  doc.save();
  doc.lineWidth(0.6).strokeColor(color);

  doc.moveTo(x - mark, y).lineTo(x, y).stroke();
  doc.moveTo(x, y - mark).lineTo(x, y).stroke();

  doc.moveTo(x + width, y - mark).lineTo(x + width, y).stroke();
  doc.moveTo(x + width, y).lineTo(x + width + mark, y).stroke();

  doc.moveTo(x - mark, y + height).lineTo(x, y + height).stroke();
  doc.moveTo(x, y + height).lineTo(x, y + height + mark).stroke();

  doc.moveTo(x + width, y + height).lineTo(x + width + mark, y + height).stroke();
  doc.moveTo(x + width, y + height).lineTo(x + width, y + height + mark).stroke();

  doc.restore();
}

function drawWrappedText(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc.font('Helvetica-Bold').text(label, x, y, { width, continued: true });
  doc.font('Helvetica').text(value, { width });
}

function drawSectionLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number) {
  doc.save();
  doc.roundedRect(x, y, width, 14, 7).fill('#F6F2E8');
  doc.fillColor('#6B6252').font('Helvetica-Bold').fontSize(7).text(text.toUpperCase(), x + 7, y + 3.5, {
    width: width - 16,
    align: 'left',
  });
  doc.restore();
}

function drawEtiqueta(
  doc: PDFKit.PDFDocument,
  lote: LotePdfData,
  venta: LotePdfVenta,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const cliente = venta.cliente
    ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
    : (venta.guest_nombre ?? 'Invitado');
  const direccion = formatDireccion(venta);

  drawCutMarks(doc, x, y, width, height);

  doc.save();
  doc.roundedRect(x, y, width, height, 10).fillAndStroke('#FFFEFB', '#DDD6C8');

  const pad = 14;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerWidth = width - pad * 2;

  doc.fillColor('#2F2A22').fontSize(10).font('Helvetica-Bold').text('Terrana', innerX, innerY);
  doc.fontSize(7.5).font('Helvetica').fillColor('#8B816F').text(`Lote ${lote.numero}`, innerX, innerY + 12, {
    width: innerWidth,
  });
  doc.fontSize(9).font('Helvetica').fillColor('#5F5648').text(venta.numero_pedido, x + width - pad - 90, innerY, {
    width: 90,
    align: 'right',
  });

  let cursorY = innerY + 28;

  drawSectionLabel(doc, 'Cliente', innerX, cursorY, 54);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1F1B16').text(cliente, innerX, cursorY + 20, {
    width: innerWidth,
  });

  cursorY += 36;
  drawSectionLabel(doc, 'Envio', innerX, cursorY, 50);
  doc.font('Helvetica').fontSize(8.2).fillColor('#6B6252').text(lote.metodo_envio.nombre, innerX, cursorY + 19, {
    width: innerWidth,
  });
  doc.font('Helvetica').fontSize(8.4).fillColor('#1F1B16').text(direccion, innerX, cursorY + 31, {
    width: innerWidth,
    height: 40,
    ellipsis: true,
  });

  cursorY += 60;
  drawSectionLabel(doc, 'Productos', innerX, cursorY, 62);

  let productsY = cursorY + 21;
  if (venta.items.length === 0) {
    doc.font('Helvetica').fontSize(8.2).fillColor('#8B816F').text('Sin productos', innerX, productsY, {
      width: innerWidth,
    });
  } else {
    venta.items.forEach((item) => {
      if (productsY > y + height - 20) return;
      doc.circle(innerX + 2, productsY + 5, 1.4).fill('#A08C22');
      doc.font('Helvetica').fontSize(8.2).fillColor('#1F1B16').text(
        `${item.producto.nombre} x ${item.cantidad}`,
        innerX + 10,
        productsY,
        {
          width: innerWidth - 10,
          lineBreak: true,
        }
      );
      productsY = doc.y + 3;
    });
  }

  doc.restore();
}

function drawEtiquetasSection(doc: PDFKit.PDFDocument, lote: LotePdfData) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 32;
  const gutterX = 18;
  const gutterY = 18;
  const labelWidth = (pageWidth - margin * 2 - gutterX) / LABEL_COLUMNS;
  const labelHeight = (pageHeight - margin * 2 - gutterY * (LABEL_ROWS - 1)) / LABEL_ROWS;

  lote.ventas.forEach((venta, index) => {
    if (index % LABELS_PER_PAGE === 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Etiquetas para bultos', margin, margin - 8);
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Imprimir y cortar por las marcas. Una etiqueta por pedido.', margin, margin + 12);
    }

    const slot = index % LABELS_PER_PAGE;
    const row = Math.floor(slot / LABEL_COLUMNS);
    const column = slot % LABEL_COLUMNS;
    const x = margin + column * (labelWidth + gutterX);
    const y = margin + 36 + row * (labelHeight + gutterY);

    drawEtiqueta(doc, lote, venta, x, y, labelWidth, labelHeight);
  });
}

function formatDireccion(venta: LotePdfVenta): string {
  const estructurada = venta.direccion
    ? [
        venta.direccion.calle,
        venta.direccion.piso_depto ? `Piso/Dpto ${venta.direccion.piso_depto}` : undefined,
        venta.direccion.localidad,
        venta.direccion.provincia,
        venta.direccion.codigo_postal ? `CP ${venta.direccion.codigo_postal}` : undefined,
        venta.direccion.pais,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return estructurada || venta.domicilio_envio || 'Sin direccion cargada';
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number) {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

export function buildLoteEnvioPdf(lote: LotePdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  doc.info.Title = `Lote ${lote.numero}`;
  doc.info.Author = 'Terrana';
  doc.info.Subject = 'Lote de envio';

  doc.fontSize(20).font('Helvetica-Bold').text('Lote de envio', { align: 'left' });
  doc.moveDown(0.4);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Numero de lote: ${lote.numero}`);
  doc.text(`Metodo de envio: ${lote.metodo_envio.nombre}`);
  doc.text(`Fecha de generacion: ${new Date(lote.created_at).toLocaleString('es-AR')}`);
  doc.text(`Generado por: ${lote.generador ? `${lote.generador.nombre} ${lote.generador.apellido}` : '—'}`);
  doc.text(`Cantidad de pedidos: ${lote.ventas.length}`);

  doc.moveDown(0.8);
  doc.fontSize(9).fillColor('#666666').text('Documento operativo para preparacion de pedidos y reparto.', { align: 'left' });
  doc.fillColor('#000000');

  lote.ventas.forEach((venta, index) => {
    ensureSpace(doc, 150);

    if (index > 0) {
      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#D9D4C7')
        .stroke();
      doc.moveDown(0.6);
    }

    const cliente = venta.cliente
      ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
      : (venta.guest_nombre ?? 'Invitado');

    doc.fontSize(13).font('Helvetica-Bold').text(`Pedido ${venta.numero_pedido}`);
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Cliente: ${cliente}`);
    doc.text(`Direccion: ${formatDireccion(venta)}`);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Productos:');
    doc.font('Helvetica');

    venta.items.forEach((item) => {
      ensureSpace(doc, 18);
      doc.text(`- ${item.producto.nombre} x ${item.cantidad}`, { indent: 10 });
    });
  });

  drawEtiquetasSection(doc, lote);

  return doc;
}