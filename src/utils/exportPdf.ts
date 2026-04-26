import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Budget, Rubro, Item, RubroCategory } from '../types';
import { formatMoney, itemTotal } from '../store/useStore';
import logoUrl from '../assets/buildkontrol-logo.png';

let logoDataUrlCache: string | null = null;

async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    logoDataUrlCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return logoDataUrlCache;
  } catch {
    return null;
  }
}

export async function exportBudgetPdf(budget: Budget): Promise<void> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;

  // Logo BuildKontrol — esquina superior derecha
  const logoData = await getLogoDataUrl();
  if (logoData) {
    const logoH = 10;
    const logoW = logoH * (950 / 170);
    doc.addImage(logoData, 'PNG', pageW - 14 - logoW, 10, logoW, logoH);
  }

  // Title
  doc.setFontSize(18);
  doc.setTextColor(31, 41, 55);
  doc.text(budget.name, 14, 20);

  // Subtitle info
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const total = budget.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0);
  const dateStr = new Date(budget.createdAt).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Base de datos: ${budget.databaseName}  |  Fecha: ${dateStr}  |  Total: ${formatMoney(total)}`, 14, 28);

  if (budget.description) {
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(budget.description, 14, 34);
  }

  // Table — Cantidad va inmediatamente después de Unidad
  const rows = budget.lineItems.map((li, idx) => [
    String(idx + 1),
    li.rubroCode,
    li.rubroName,
    li.rubroUnit,
    String(li.quantity),
    formatMoney(li.unitCost),
    formatMoney(li.unitCost * li.quantity),
  ]);

  // Grand total row
  rows.push(['', '', '', '', '', 'TOTAL', formatMoney(total)]);

  autoTable(doc, {
    startY: budget.description ? 40 : 34,
    head: [['#', 'Código', 'Descripción', 'Unidad', 'Cantidad', 'P. Unitario', 'Total']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  const generated = `Generado el ${new Date().toLocaleString('es-EC')}`;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(generated, 14, doc.internal.pageSize.height - 8);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 8, { align: 'right' });
  }

  doc.save(`${budget.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

const TYPE_ORDER = ['material', 'manoDeObra', 'equipo', 'subcontrato'] as const;
const TYPE_LABELS: Record<string, string> = {
  material: 'MATERIALES',
  manoDeObra: 'MANO DE OBRA',
  equipo: 'EQUIPOS',
  subcontrato: 'SUBCONTRATOS',
};
const TYPE_COLORS: Record<string, [number, number, number]> = {
  material:    [219, 234, 254],
  manoDeObra:  [254, 235, 213],
  equipo:      [237, 233, 254],
  subcontrato: [254, 252, 207],
};

export async function exportRubroPdf(
  rubro: Rubro,
  items: Item[],
  rubroCategories: RubroCategory[],
): Promise<void> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;

  // Header block
  doc.setFillColor(31, 45, 69);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE PRECIO UNITARIO', 14, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el ${new Date().toLocaleString('es-EC')}`, 14, 18);

  // Logo BuildKontrol — proporción ~5.5:1 (logo 950×170)
  const logoData = await getLogoDataUrl();
  if (logoData) {
    const logoH = 8;
    const logoW = logoH * (950 / 170);
    doc.addImage(logoData, 'PNG', pageW - 14 - logoW, 4, logoW, logoH);
  } else {
    doc.text('BuildKontrol', pageW - 14, 18, { align: 'right' });
  }

  // APU info grid
  let y = 36;
  const catName = rubroCategories.find((c) => c.id === rubro.categoryId)?.name ?? '—';
  const infoRows = [
    ['Código', rubro.code, 'Categoría', catName],
    ['Nombre', rubro.name, 'Unidad', rubro.unit],
    ...(rubro.description ? [['Descripción', rubro.description, '', '']] : []),
  ];
  doc.setFontSize(9);
  for (const [l1, v1, l2, v2] of infoRows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(l1 + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(String(v1), 45, y);
    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(l2 + ':', 120, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(v2), 148, y);
    }
    y += 7;
  }
  y += 4;

  // Components by type
  let grandTotal = 0;
  for (const type of TYPE_ORDER) {
    const comps = rubro.components.filter((c) => c.type === type);
    if (comps.length === 0) continue;

    const rows = comps.map((comp) => {
      const item = items.find((i) => i.id === comp.itemId);
      if (!item) return ['—', '—', '—', '—', '—'];
      const up = itemTotal(item);
      const sub = up * comp.quantity;
      grandTotal += sub;
      return [
        item.code,
        item.name,
        item.unit,
        parseFloat(comp.quantity.toFixed(6)).toString(),
        formatMoney(up),
        formatMoney(sub),
      ];
    });

    const [r, g, b] = TYPE_COLORS[type];
    const typeBarStyle = {
      fillColor: [r, g, b] as [number, number, number],
      textColor: [30, 30, 30] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8,
    };
    const colHeaderStyle = {
      fillColor: [243, 244, 246] as [number, number, number],
      textColor: [80, 80, 80] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 7.5,
    };
    autoTable(doc, {
      startY: y,
      head: [
        [{ content: TYPE_LABELS[type], colSpan: 6, styles: typeBarStyle }],
        [
          { content: 'Código', styles: colHeaderStyle },
          { content: 'Descripción', styles: colHeaderStyle },
          { content: 'Unidad', styles: { ...colHeaderStyle, halign: 'center' as const } },
          { content: 'Cantidad', styles: { ...colHeaderStyle, halign: 'right' as const } },
          { content: 'P. Unit.', styles: { ...colHeaderStyle, halign: 'right' as const } },
          { content: 'Subtotal', styles: { ...colHeaderStyle, halign: 'right' as const } },
        ],
      ],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 22, textColor: [80, 80, 80] },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // Total row
  autoTable(doc, {
    startY: y,
    body: [['', '', '', '', 'COSTO TOTAL', formatMoney(grandTotal)]],
    styles: { fontSize: 9, cellPadding: 3, fontStyle: 'bold', fillColor: [243, 244, 246] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26, halign: 'right', textColor: [31, 45, 69] },
      5: { cellWidth: 26, halign: 'right', textColor: [22, 101, 52] },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`APU_${rubro.code.replace(/[^a-z0-9]/gi, '_')}_${rubro.name.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}.pdf`);
}
