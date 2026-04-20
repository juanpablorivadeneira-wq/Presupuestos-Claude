import * as XLSX from 'xlsx';
import { Budget } from '../types';

export function exportBudgetExcel(budget: Budget): void {
  const total = budget.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0);

  const headers = ['#', 'Código', 'Descripción', 'Unidad', 'P. Unitario', 'Cantidad', 'Total'];

  const rows = budget.lineItems.map((li, idx) => [
    idx + 1,
    li.rubroCode,
    li.rubroName,
    li.rubroUnit,
    li.unitCost,
    li.quantity,
    li.unitCost * li.quantity,
  ]);

  // Total row
  rows.push(['', '', '', '', '', 'TOTAL', total]);

  const wsData = [headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 45 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ];

  // Style header row (bold) — note: xlsx community edition doesn't support cell styles
  // so we just set the data. For styled exports, xlsx-js-style would be needed.

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');

  // Add metadata sheet
  const metaData = [
    ['Presupuesto', budget.name],
    ['Descripción', budget.description],
    ['Base de datos', budget.databaseName],
    ['Creado', new Date(budget.createdAt).toLocaleDateString('es-EC')],
    ['Total', total],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  wsMeta['!cols'] = [{ wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Info');

  XLSX.writeFile(wb, `${budget.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
}

export function exportCompareExcel(
  budgets: Array<{ name: string; lineItems: Array<{ rubroCode: string; rubroName: string; rubroUnit: string; unitCost: number; quantity: number }> }>
): void {
  // Build a merged row index by rubroCode
  const allCodes = new Set<string>();
  for (const b of budgets) {
    for (const li of b.lineItems) allCodes.add(li.rubroCode);
  }
  const codes = Array.from(allCodes);

  // Header row
  const header: (string | number)[] = ['Código', 'Descripción', 'Unidad'];
  for (const b of budgets) {
    header.push(`${b.name} - P.Unit`, `${b.name} - Cant`, `${b.name} - Total`);
  }

  const rows: (string | number)[][] = [];
  for (const code of codes) {
    const row: (string | number)[] = [];
    let description = '';
    let unit = '';
    for (const b of budgets) {
      const li = b.lineItems.find((l) => l.rubroCode === code);
      if (li) {
        description = li.rubroName;
        unit = li.rubroUnit;
      }
    }
    row.push(code, description, unit);
    for (const b of budgets) {
      const li = b.lineItems.find((l) => l.rubroCode === code);
      if (li) {
        row.push(li.unitCost, li.quantity, li.unitCost * li.quantity);
      } else {
        row.push('', '', '');
      }
    }
    rows.push(row);
  }

  // Total row
  const totalRow: (string | number)[] = ['', '', 'TOTAL'];
  for (const b of budgets) {
    const t = b.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0);
    totalRow.push('', '', t);
  }
  rows.push(totalRow);

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 12 }, ...budgets.flatMap(() => [{ wch: 15 }, { wch: 12 }, { wch: 15 }])];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');
  XLSX.writeFile(wb, 'Comparativo_Presupuestos.xlsx');
}
