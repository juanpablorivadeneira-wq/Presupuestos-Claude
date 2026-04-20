import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Budget } from '../types';
import { formatMoney } from '../store/useStore';

export function exportBudgetPdf(budget: Budget): void {
  const doc = new jsPDF();

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

  // Table
  const rows = budget.lineItems.map((li, idx) => [
    String(idx + 1),
    li.rubroCode,
    li.rubroName,
    li.rubroUnit,
    formatMoney(li.unitCost),
    String(li.quantity),
    formatMoney(li.unitCost * li.quantity),
  ]);

  // Grand total row
  rows.push(['', '', '', '', '', 'TOTAL', formatMoney(total)]);

  autoTable(doc, {
    startY: budget.description ? 40 : 34,
    head: [['#', 'Código', 'Descripción', 'Unidad', 'P. Unitario', 'Cantidad', 'Total']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [31, 41, 55], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 70 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
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
