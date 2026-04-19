import React, { useState, useMemo, useRef } from 'react';
import { Upload, ChevronDown, ChevronRight, X, Check, AlertTriangle } from 'lucide-react';
import { useStore, formatMoney } from '../../store/useStore';
import { MedicionStatus } from '../../types';
import { useResizableColumns } from '../shared/useResizableColumns.tsx';

const STATUS_META: Record<MedicionStatus, { label: string; classes: string }> = {
  pendiente:  { label: 'Pendiente',  classes: 'bg-gray-100 text-gray-600' },
  en_proceso: { label: 'En proceso', classes: 'bg-amber-100 text-amber-700' },
  medido:     { label: 'Medido',     classes: 'bg-blue-100 text-blue-700' },
  verificado: { label: 'Verificado', classes: 'bg-green-100 text-green-700' },
};
const STATUS_CYCLE: MedicionStatus[] = ['pendiente', 'en_proceso', 'medido', 'verificado'];

function nextStatus(s: MedicionStatus): MedicionStatus {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function diffColor(pct: number | null): string {
  if (pct === null) return 'text-gray-300';
  const abs = Math.abs(pct);
  if (abs <= 5) return 'text-gray-500';
  if (abs <= 15) return 'text-amber-600';
  return pct > 0 ? 'text-red-600' : 'text-green-600';
}

function parseCSV(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (!inQ && ch === delimiter) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

interface ImportModalProps {
  projectId: string;
  onClose: (imported: number) => void;
}

function ImportModal({ projectId, onClose }: ImportModalProps) {
  const { importRevitCsv } = useStore();
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [delimiter, setDelimiter] = useState(',');
  const [skipRows, setSkipRows] = useState(0);
  const [codeCol, setCodeCol] = useState(0);
  const [qtyCol, setQtyCol] = useState(1);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, delimiter);
      setRows(parsed);
      setHeaders(parsed[skipRows] ?? []);
      setStep('map');
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleImport() {
    const dataRows = rows.slice(skipRows + 1);
    const matches = dataRows
      .map((r) => ({ code: r[codeCol] ?? '', quantity: parseFloat((r[qtyCol] ?? '').replace(',', '.')) }))
      .filter((m) => m.code && !isNaN(m.quantity));
    const n = importRevitCsv(projectId, matches);
    setImported(n);
    setStep('done');
  }

  const preview = useMemo(() => {
    if (step !== 'map') return [];
    return rows.slice(skipRows + 1, skipRows + 6);
  }, [rows, skipRows, step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Importar cantidades desde Revit CSV</h2>
          <button onClick={() => onClose(0)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {step === 'upload' && (
            <>
              <p className="text-sm text-gray-500">
                Exporta un Schedule de Revit (<b>File → Export → Reports → Schedule</b>) en formato CSV y súbelo aquí. La app comparará los códigos de rubro con los del proyecto de medición.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Separador</label>
                  <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md">
                    <option value=",">Coma (,)</option>
                    <option value=";">Punto y coma (;)</option>
                    <option value={'\t'}>Tabulador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Filas de encabezado a omitir</label>
                  <input type="number" min={0} max={10} value={skipRows} onChange={(e) => setSkipRows(Number(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md" />
                </div>
              </div>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors w-full justify-center">
                <Upload size={16} /> Seleccionar archivo CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </>
          )}

          {step === 'map' && (
            <>
              <p className="text-sm text-gray-500">Se detectaron <b>{rows.length - skipRows - 1}</b> filas de datos. Selecciona qué columnas corresponden al código y la cantidad.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Columna de Código</label>
                  <select value={codeCol} onChange={(e) => setCodeCol(Number(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md">
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Columna de Cantidad</label>
                  <select value={qtyCol} onChange={(e) => setQtyCol(Number(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md">
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Vista previa (primeras 5 filas de datos):</p>
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50">{headers.map((h, i) => <th key={i} className={`px-3 py-1.5 text-left font-semibold ${i === codeCol ? 'bg-teal-50 text-teal-700' : i === qtyCol ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>{h || `Col ${i+1}`}</th>)}</tr></thead>
                    <tbody>{preview.map((row, ri) => <tr key={ri} className="border-t border-gray-100">{row.map((cell, ci) => <td key={ci} className={`px-3 py-1 ${ci === codeCol ? 'bg-teal-50/50 font-mono' : ci === qtyCol ? 'bg-blue-50/50' : ''}`}>{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                <Check size={28} className="text-teal-600" />
              </div>
              <p className="text-base font-semibold text-gray-800">{imported} rubros actualizados</p>
              <p className="text-sm text-gray-500">Las cantidades Revit han sido importadas. Los rubros sin coincidencia de código mantienen su valor anterior.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          {step === 'upload' && <button onClick={() => onClose(0)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>}
          {step === 'map' && (
            <>
              <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Atrás</button>
              <button onClick={handleImport} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700">Importar</button>
            </>
          )}
          {step === 'done' && <button onClick={() => onClose(imported)} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700">Cerrar</button>}
        </div>
      </div>
    </div>
  );
}

export default function MedicionView() {
  const medicionProjects = useStore((s) => s.medicionProjects);
  const currentMedicionId = useStore((s) => s.currentMedicionId);
  const { updateMedicionStatus, updateMedicionQuantityRevit, updateMedicionNotes } = useStore();

  const project = medicionProjects.find((p) => p.id === currentMedicionId) ?? null;

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<MedicionStatus | 'all'>('all');
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const { widths, resizer } = useResizableColumns({ codigo: 100, nombre: 240, unidad: 64, cantBudget: 96, cantRevit: 96, diff: 88, pctDiff: 80, impacto: 110, estado: 108 });

  const totalTableWidth = widths.codigo + widths.nombre + widths.unidad + widths.cantBudget + widths.cantRevit + widths.diff + widths.pctDiff + widths.impacto + widths.estado + 32;

  const filtered = useMemo(() => {
    if (!project) return [];
    return project.lineItems.filter((li) => {
      if (filterStatus !== 'all' && li.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return li.rubroCode.toLowerCase().includes(q) || li.rubroName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [project, search, filterStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: typeof filtered }>();
    for (const li of filtered) {
      const key = li.categoryId ?? '__none__';
      if (!map.has(key)) map.set(key, { name: li.categoryName || 'Sin Categoría', items: [] });
      map.get(key)!.items.push(li);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  }, [filtered]);

  const totals = useMemo(() => {
    if (!project) return { budget: 0, revit: 0, impact: 0, medidos: 0, verificados: 0 };
    const all = project.lineItems;
    return {
      budget: all.reduce((s, li) => s + li.quantityBudget * li.unitCost, 0),
      revit: all.reduce((s, li) => s + li.quantityRevit * li.unitCost, 0),
      impact: all.reduce((s, li) => s + (li.quantityRevit - li.quantityBudget) * li.unitCost, 0),
      medidos: all.filter((li) => li.status === 'medido' || li.status === 'verificado').length,
      verificados: all.filter((li) => li.status === 'verificado').length,
    };
  }, [project]);

  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function commitQty(li: typeof filtered[0]) {
    const v = parseFloat(editingQty.replace(',', '.'));
    if (!isNaN(v) && project) updateMedicionQuantityRevit(project.id, li.id, Math.max(0, v));
    setEditingId(null);
  }

  function commitNote(li: typeof filtered[0]) {
    if (project) updateMedicionNotes(project.id, li.id, editingNote);
    setEditingNoteId(null);
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No hay proyecto de medición abierto.
      </div>
    );
  }

  const measuredPct = project.lineItems.length > 0 ? (totals.medidos / project.lineItems.length) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showImport && <ImportModal projectId={project.id} onClose={(n) => { setShowImport(false); if (n > 0) { /* toast optional */ } }} />}

      {/* Info bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{project.name}</h2>
            {project.description && <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>}
            <p className="text-xs text-gray-400 mt-0.5">
              Presupuesto: <span className="text-gray-600 font-medium">{project.budgetName}</span>
              {' · '}<span className="font-semibold text-teal-600">{totals.medidos}/{project.lineItems.length}</span> rubros medidos/verificados
            </p>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-400">Costo presupuestado</p>
              <p className="text-lg font-bold text-gray-700">{formatMoney(totals.budget)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Costo según Revit</p>
              <p className={`text-lg font-bold ${totals.impact > 0.005 ? 'text-red-600' : totals.impact < -0.005 ? 'text-green-600' : 'text-gray-700'}`}>{formatMoney(totals.revit)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Desfase</p>
              <p className={`text-lg font-bold ${totals.impact > 0.005 ? 'text-red-600' : totals.impact < -0.005 ? 'text-green-600' : 'text-gray-500'}`}>
                {totals.impact > 0 ? '+' : ''}{formatMoney(totals.impact)}
              </p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${measuredPct}%` }} />
          </div>
          <span className="text-xs text-teal-600 font-semibold whitespace-nowrap">{measuredPct.toFixed(0)}% medido</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-teal-50 border-b border-teal-200 shrink-0 flex-wrap">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar rubro..." className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white w-52"
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MedicionStatus | 'all')} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
          <option value="all">Todos los estados</option>
          {STATUS_CYCLE.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          <Upload size={14} /> Importar CSV Revit
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="text-sm border-separate border-spacing-0" style={{ tableLayout: 'fixed', width: totalTableWidth }}>
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
            <tr>
              <th style={{ width: 32 }} className="px-2 py-3 border-b border-gray-200"></th>
              {([
                ['codigo','Código','left'], ['nombre','Nombre','left'], ['unidad','Und.','left'],
                ['cantBudget','Cant. Ppto','right'], ['cantRevit','Cant. Revit','right'],
                ['diff','Dif.','right'], ['pctDiff','% Dif.','right'],
                ['impacto','Impacto $','right'], ['estado','Estado','center'],
              ] as const).map(([col, label, align]) => (
                <th key={col} style={{ width: widths[col as keyof typeof widths] }} className={`relative px-3 py-3 text-${align} font-medium border-b border-gray-200 select-none`}>
                  <span className="truncate block">{label}</span>
                  {resizer(col as keyof typeof widths)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([key, { name, items }]) => {
              const isCollapsed = collapsedChapters.has(key);
              const chapterMedidos = items.filter((li) => li.status === 'medido' || li.status === 'verificado').length;
              return (
                <React.Fragment key={key}>
                  {/* Chapter row */}
                  <tr className="bg-teal-50/60 cursor-pointer hover:bg-teal-50" onClick={() => toggleChapter(key)}>
                    <td className="px-2 py-2 text-center text-teal-600">
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </td>
                    <td colSpan={8} className="px-3 py-2">
                      <span className="font-semibold text-teal-800 text-xs uppercase tracking-wide">{name}</span>
                      <span className="ml-2 text-xs text-teal-600">{chapterMedidos}/{items.length}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs text-teal-600 font-medium">{items.length > 0 ? Math.round(chapterMedidos / items.length * 100) : 0}%</span>
                    </td>
                  </tr>
                  {!isCollapsed && items.map((li) => {
                    const hasRevit = li.quantityRevit > 0;
                    const diff = hasRevit ? li.quantityRevit - li.quantityBudget : null;
                    const pct = diff !== null && li.quantityBudget > 0 ? (diff / li.quantityBudget) * 100 : null;
                    const impact = diff !== null ? diff * li.unitCost : null;
                    const meta = STATUS_META[li.status];
                    const isEditingQty = editingId === li.id;
                    const isEditingNote = editingNoteId === li.id;
                    return (
                      <tr key={li.id} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                        <td className="px-2 py-2"></td>
                        {/* Código */}
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 truncate">{li.rubroCode}</td>
                        {/* Nombre */}
                        <td className="px-3 py-2 truncate">
                          <div className="text-sm font-medium text-gray-800 truncate" title={li.rubroName}>{li.rubroName}</div>
                          {isEditingNote ? (
                            <input
                              autoFocus type="text" value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              onBlur={() => commitNote(li)}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitNote(li); if (e.key === 'Escape') setEditingNoteId(null); }}
                              className="mt-0.5 w-full text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          ) : (
                            <div
                              className="text-xs text-gray-400 mt-0.5 cursor-text hover:text-gray-600 min-h-[14px]"
                              onClick={() => { setEditingNoteId(li.id); setEditingNote(li.notes); }}
                              title="Click para añadir nota"
                            >
                              {li.notes || <span className="italic opacity-50">+ nota</span>}
                            </div>
                          )}
                        </td>
                        {/* Unidad */}
                        <td className="px-3 py-2 text-xs text-gray-500">{li.rubroUnit}</td>
                        {/* Cant. Presupuesto */}
                        <td className="px-3 py-2 text-right text-sm text-gray-700">{li.quantityBudget.toLocaleString('es-EC', { maximumFractionDigits: 2 })}</td>
                        {/* Cant. Revit — editable */}
                        <td className="px-3 py-2 text-right">
                          {isEditingQty ? (
                            <input
                              autoFocus type="number" value={editingQty} min={0}
                              onChange={(e) => setEditingQty(e.target.value)}
                              onBlur={() => commitQty(li)}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitQty(li); if (e.key === 'Escape') setEditingId(null); }}
                              className="w-full text-right text-sm border border-teal-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingId(li.id); setEditingQty(String(li.quantityRevit)); }}
                              className={`w-full text-right text-sm rounded px-1 py-0.5 hover:bg-teal-50 transition-colors ${hasRevit ? 'font-medium text-teal-700' : 'text-gray-300 italic'}`}
                            >
                              {hasRevit ? li.quantityRevit.toLocaleString('es-EC', { maximumFractionDigits: 2 }) : '—'}
                            </button>
                          )}
                        </td>
                        {/* Diferencia */}
                        <td className={`px-3 py-2 text-right text-sm font-medium ${diffColor(pct)}`}>
                          {diff !== null ? (diff > 0 ? '+' : '') + diff.toLocaleString('es-EC', { maximumFractionDigits: 2 }) : <span className="text-gray-300">—</span>}
                        </td>
                        {/* % Diferencia */}
                        <td className={`px-3 py-2 text-right text-sm font-medium ${diffColor(pct)}`}>
                          {pct !== null ? (pct > 0 ? '+' : '') + pct.toFixed(1) + '%' : <span className="text-gray-300">—</span>}
                        </td>
                        {/* Impacto $ */}
                        <td className={`px-3 py-2 text-right text-sm font-medium ${diffColor(pct)}`}>
                          {impact !== null ? (impact > 0 ? '+' : '') + formatMoney(impact) : <span className="text-gray-300">—</span>}
                        </td>
                        {/* Estado */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => updateMedicionStatus(project.id, li.id, nextStatus(li.status))}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${meta.classes}`}
                            title="Click para cambiar estado"
                          >
                            {meta.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {project.lineItems.length === 0 ? 'Este presupuesto no tiene rubros.' : 'No hay rubros con el filtro actual.'}
          </div>
        )}
        {/* Footer totals */}
        {filtered.length > 0 && (
          <div className="sticky bottom-0 bg-teal-50 border-t-2 border-teal-200 px-4 py-2.5 flex items-center gap-6 text-xs font-semibold text-teal-800">
            <span>Total ({project.lineItems.length} rubros)</span>
            <span className="ml-auto">Ppto: {formatMoney(totals.budget)}</span>
            <span>Revit: {formatMoney(totals.revit)}</span>
            <AlertTriangle size={13} className={totals.impact > 0.005 ? 'text-red-500' : 'text-green-600'} />
            <span className={totals.impact > 0.005 ? 'text-red-600' : 'text-green-600'}>
              {totals.impact > 0 ? '+' : ''}{formatMoney(totals.impact)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
