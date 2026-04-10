import PDFDocument from 'pdfkit';

interface LotePdfVenta {
  numero_pedido: string;
  total?: number | string;
  pago_estado?: string | null;
  metodo_pago?: string | null;
  notas?: string | null;
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

function normalizarTexto(texto?: string | null): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function esPagoEnDestino(venta: LotePdfVenta): boolean {
  const pagoEstado = normalizarTexto(venta.pago_estado);
  const metodoPago = normalizarTexto(venta.metodo_pago);
  return pagoEstado === 'en destino' || pagoEstado === 'en_destino' || metodoPago === 'en destino' || metodoPago === 'en_destino';
}

function formatMonto(n: number | string | undefined): string {
  const monto = Number(n ?? 0);
  return `$${monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function drawInlineField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  innerWidth: number,
  opts?: { labelColor?: string; valueColor?: string; fontSize?: number; valueBold?: boolean },
) {
  const fs = opts?.fontSize ?? 8.5;
  const lc = opts?.labelColor ?? '#6B6252';
  const vc = opts?.valueColor ?? '#1F1B16';
  doc.font('Helvetica-Bold').fontSize(fs).fillColor(lc).text(`${label}: `, x, y, {
    continued: true,
    width: innerWidth,
  });
  doc.font(opts?.valueBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(vc).text(value, {
    width: innerWidth,
  });
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

  // — Encabezado —
  doc.fillColor('#2F2A22').fontSize(10).font('Helvetica-Bold').text('Terrana', innerX, innerY);
  doc.fontSize(7.5).font('Helvetica').fillColor('#8B816F').text(`Lote ${lote.numero}`, innerX, innerY + 12, {
    width: innerWidth,
  });
  doc.fontSize(9).font('Helvetica').fillColor('#5F5648').text(venta.numero_pedido, x + width - pad - 90, innerY, {
    width: 90,
    align: 'right',
  });

  // Separador
  const sepY = innerY + 26;
  doc.moveTo(innerX, sepY).lineTo(innerX + innerWidth, sepY).lineWidth(0.5).strokeColor('#DDD6C8').stroke();

  let cursorY = sepY + 8;

  // — Campos en línea —
  drawInlineField(doc, 'Cliente', cliente, innerX, cursorY, innerWidth, { fontSize: 10, valueBold: true });
  cursorY = doc.y + 4;

  drawInlineField(doc, 'Envio', lote.metodo_envio.nombre, innerX, cursorY, innerWidth, { fontSize: 9.5 });
  cursorY = doc.y + 2;

  drawInlineField(doc, 'Direccion', direccion, innerX, cursorY, innerWidth, { fontSize: 9.5 });
  cursorY = doc.y + 4;

  if (esPagoEnDestino(venta)) {
    drawInlineField(
      doc,
      'Cobro',
      `Pago en destino (${formatMonto(venta.total)})`,
      innerX,
      cursorY,
      innerWidth,
      { fontSize: 9.5, labelColor: '#8A6A00', valueColor: '#8A6A00', valueBold: true },
    );
    cursorY = doc.y + 4;
  }

  // — Notas (debajo de Cobro) —
  if (venta.notas && venta.notas.trim()) {
    drawInlineField(doc, 'Notas', venta.notas.trim(), innerX, cursorY, innerWidth, { fontSize: 9.5 });
    cursorY = doc.y + 4;
  }

  // Separador antes de productos
  doc.moveTo(innerX, cursorY).lineTo(innerX + innerWidth, cursorY).lineWidth(0.4).strokeColor('#DDD6C8').stroke();
  cursorY += 6;

  // — Productos —
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#6B6252').text('Productos:', innerX, cursorY, { width: innerWidth });
  cursorY = doc.y + 2;

  if (venta.items.length === 0) {
    doc.font('Helvetica').fontSize(9.2).fillColor('#8B816F').text('Sin productos', innerX, cursorY, { width: innerWidth });
    cursorY = doc.y + 3;
  } else {
    venta.items.forEach((item) => {
      if (cursorY > y + height - 18) return;
      doc.circle(innerX + 2, cursorY + 5.5, 1.4).fill('#A08C22');
      doc.font('Helvetica').fontSize(9.2).fillColor('#1F1B16').text(
        `${item.producto.nombre} x ${item.cantidad}`,
        innerX + 10,
        cursorY,
        { width: innerWidth - 10, lineBreak: true },
      );
      cursorY = doc.y + 2;
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

  const marginL = doc.page.margins.left;
  const marginR = doc.page.margins.right;
  const contentW = doc.page.width - marginL - marginR;

  // ── Encabezado principal ──────────────────────────────────────────────────
  doc.rect(marginL, 40, contentW, 52).fill('#2F2A22');
  doc.fillColor('#F6F2E8').fontSize(18).font('Helvetica-Bold')
    .text('Lote de envio', marginL + 14, 52, { width: contentW - 28 });
  doc.fillColor('#A08C6A').fontSize(9).font('Helvetica')
    .text('Documento operativo para preparacion de pedidos y reparto.', marginL + 14, 74, { width: contentW - 28 });

  // Bloque de metadatos
  const metaY = 40 + 52 + 10;
  doc.rect(marginL, metaY, contentW, 36).fill('#F6F2E8');

  const col1 = marginL + 14;
  const col2 = marginL + contentW * 0.38;
  const col3 = marginL + contentW * 0.68;

  doc.fillColor('#6B6252').fontSize(7.5).font('Helvetica-Bold')
    .text('LOTE', col1, metaY + 6).text('METODO DE ENVIO', col2, metaY + 6).text('GENERADO POR', col3, metaY + 6);
  doc.fillColor('#1F1B16').fontSize(9.5).font('Helvetica-Bold')
    .text(lote.numero, col1, metaY + 17, { width: col2 - col1 - 8 })
  doc.font('Helvetica')
    .text(lote.metodo_envio.nombre, col2, metaY + 17, { width: col3 - col2 - 8 })
    .text(lote.generador ? `${lote.generador.nombre} ${lote.generador.apellido}` : '—', col3, metaY + 17, { width: contentW - (col3 - marginL) - 14 });

  // Fila: fecha + cantidad
  const meta2Y = metaY + 36 + 6;
  doc.fillColor('#888').fontSize(8).font('Helvetica')
    .text(
      `Generado el ${new Date(lote.created_at).toLocaleString('es-AR')}   ·   ${lote.ventas.length} pedido${lote.ventas.length !== 1 ? 's' : ''}`,
      marginL, meta2Y, { width: contentW, align: 'right' },
    );

  doc.moveDown(0.2);

  // ── Pedidos ───────────────────────────────────────────────────────────────
  const leftColW = Math.floor(contentW * 0.54);
  const rightColW = contentW - leftColW - 16;
  const rightColX = marginL + leftColW + 16;

  lote.ventas.forEach((venta, index) => {
    ensureSpace(doc, 120);

    const startY = doc.y + (index === 0 ? 10 : 6);

    // Cabecera del pedido
    doc.rect(marginL, startY, contentW, 22).fill('#EDE8DC');
    doc.fillColor('#2F2A22').fontSize(11).font('Helvetica-Bold')
      .text(`Pedido ${venta.numero_pedido}`, marginL + 10, startY + 5, { width: leftColW - 10, continued: true });
    doc.fillColor('#8B816F').fontSize(8.5).font('Helvetica')
      .text(`  ${index + 1} / ${lote.ventas.length}`, { continued: false });

    const bodyY = startY + 28;

    const cliente = venta.cliente
      ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
      : (venta.guest_nombre ?? 'Invitado');

    // — Columna izquierda: datos del cliente —
    let ly = bodyY;

    doc.fillColor('#6B6252').fontSize(7.5).font('Helvetica-Bold').text('CLIENTE', marginL, ly, { width: leftColW });
    ly += 11;
    doc.fillColor('#1F1B16').fontSize(10).font('Helvetica-Bold').text(cliente, marginL, ly, { width: leftColW });
    ly = doc.y + 5;

    doc.fillColor('#6B6252').fontSize(7.5).font('Helvetica-Bold').text('DIRECCION', marginL, ly, { width: leftColW });
    ly += 11;
    doc.fillColor('#3A3530').fontSize(9).font('Helvetica').text(formatDireccion(venta), marginL, ly, { width: leftColW });
    ly = doc.y + 5;

    if (esPagoEnDestino(venta)) {
      doc.rect(marginL, ly, leftColW, 20).fill('#FFF8E7');
      doc.fillColor('#8A6A00').fontSize(8).font('Helvetica-Bold')
        .text('COBRO EN DESTINO', marginL + 6, ly + 3, { width: leftColW - 80, continued: true });
      doc.fontSize(9.5).text(`  ${formatMonto(venta.total)}`, { continued: false });
      ly = ly + 22;
    }

    if (venta.notas && venta.notas.trim()) {
      doc.fillColor('#6B6252').fontSize(7.5).font('Helvetica-Bold').text('NOTAS', marginL, ly + 2, { width: leftColW });
      ly += 13;
      doc.fillColor('#555555').fontSize(9).font('Helvetica').text(venta.notas.trim(), marginL, ly, { width: leftColW });
      ly = doc.y + 4;
    }

    // — Columna derecha: productos —
    doc.moveTo(rightColX - 8, bodyY).lineTo(rightColX - 8, ly + 4).lineWidth(0.5).strokeColor('#D9D4C7').stroke();

    let ry = bodyY;
    doc.fillColor('#6B6252').fontSize(7.5).font('Helvetica-Bold').text('PRODUCTOS', rightColX, ry, { width: rightColW });
    ry += 11;

    if (venta.items.length === 0) {
      doc.fillColor('#8B816F').fontSize(9).font('Helvetica').text('Sin productos', rightColX, ry, { width: rightColW });
    } else {
      venta.items.forEach((item) => {
        ensureSpace(doc, 16);
        doc.circle(rightColX + 3, ry + 5.5, 1.6).fill('#A08C22');
        doc.fillColor('#1F1B16').fontSize(9.5).font('Helvetica')
          .text(item.producto.nombre, rightColX + 12, ry, { width: rightColW - 12, continued: true });
        doc.font('Helvetica-Bold').text(`  x${item.cantidad}`, { continued: false });
        ry = doc.y + 2;
      });
    }

    // Separador de cierre
    const closeY = Math.max(ly, ry) + 8;
    doc.moveTo(marginL, closeY).lineTo(marginL + contentW, closeY).lineWidth(0.8).strokeColor('#C8C0B0').stroke();
    doc.y = closeY + 6;
  });

  drawEtiquetasSection(doc, lote);

  return doc;
}