import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore, formatMoney, rubroTotal } from '../../store/useStore';
import { AppView } from '../../types';
import { useResizableColumns } from '../shared/useResizableColumns.tsx';

interface ActualizacionViewProps {
  onNavigate: (view: AppView) => void;
}

export default function ActualizacionView({ onNavigate: _onNavigate }: ActualizacionViewProps) {
  const budgetUpdates = useStore((s) => s.budgetUpdates);
  const currentBudgetUpdateId = useStore((s) => s.currentBudgetUpdateId);
  const databases = useStore((s) => s.databases);
  const { changeBudgetUpdateDatabase, updateBudgetUpdateProgress } = useStore();

  const update = budgetUpdates.find((u) => u.id === currentBudgetUpdateId) ?? null;
  const newDb = update ? databases.find((d) => d.id === update.newDatabaseId) ?? null : null;
  const ivaRate = update?.ivaRate ?? 0.12;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const { widths, resizer } = useResizableColumns({ codigo: 112, nombre: 240, unidad: 64, cantTotal: 88, avance: 120, cantRest: 88, pUnitOrig: 110, pUnitNuevo: 110, costoOrig: 120, costoNuevo: 120, impacto: 110 });

  // Compute enriched line items (new prices computed on-the-fly from new DB)
  const enriched = useMemo(() => {
    if (!update) return [];
    return update.lineItems.map((li) => {
      const progress = li.progress ?? 0;
      const remainingQty = li.quantity * (1 - progress / 100);
      const oldRemainingCost = li.oldUnitCost * remainingQty;

      let newUnitCost = li.oldUnitCost;
      let matched = false;

      if (newDb) {
        const matchedRubro = newDb.rubros.find((r) => r.code === li.rubroCode);
        if (matchedRubro) {
          newUnitCost = rubroTotal(matchedRubro, newDb.items);
          matched = true;
        }
      }

      const newRemainingCost = newUnitCost * remainingQty;
      const impact = newRemainingCost - oldRemainingCost;
      const priceDiff = newUnitCost - li.oldUnitCost;

      return { ...li, progress, remainingQty, oldRemainingCost, newUnitCost, matched, newRemainingCost, impact, priceDiff };
    });
  }, [update, newDb]);

  // Group by chapter
  const grouped = useMemo(() => {
    const map = new Map<string, { categoryName: string; items: typeof enriched }>();
    for (const li of enriched) {
      const key = li.categoryId ?? '__none__';
      if (!map.has(key)) map.set(key, { categoryName: li.categoryName || 'Sin Categoría', items: [] });
      map.get(key)!.items.push(li);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.categoryName.localeCompare(b.categoryName));
  }, [enriched]);

  // Summary
  const totalOldRemaining = enriched.reduce((s, li) => s + li.oldRemainingCost, 0);
  const totalNewRemaining = enriched.reduce((s, li) => s + li.newRemainingCost, 0);
  const totalImpact = totalNewRemaining - totalOldRemaining;
  const totalBudget = enriched.reduce((s, li) => s + li.oldUnitCost * li.quantity, 0);
  const totalExecuted = enriched.reduce((s, li) => s + li.oldUnitCost * li.quantity * (li.progress / 100), 0);
  const overallProgress = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;

  function startEdit(id: string, current: number) {
    setEditingId(id);
    setEditingVal(String(current));
  }

  function commitEdit() {
    if (!editingId || !update) { setEditingId(null); return; }
    const val = parseFloat(editingVal);
    if (!isNaN(val)) updateBudgetUpdateProgress(update.id, editingId, Math.max(0, Math.min(100, val)));
    setEditingId(null);
  }

  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function ic(val: number) {
    if (val > 0.005) return 'text-red-600';
    if (val < -0.005) return 'text-green-600';
    return 'text-gray-400';
  }
  function sign(val: number) { return val > 0.005 ? '+' : ''; }

  if (!update) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No hay actualización abierta.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Info bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{update.name}</h2>
            {update.description && <p className="text-xs text-gray-500 mt-0.5">{update.description}</p>}
            <p className="text-xs text-gray-400 mt-0.5">
              Presupuesto origen: <span className="text-gray-600 font-medium">{update.sourceBudgetName}</span>
              {' · '}Avance general: <span className="font-semibold text-amber-600">{overallProgress.toFixed(1)}%</span>
              {' · '}Creado: {new Date(update.createdAt).toLocaleDateString('es-EC')}
            </p>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-400">Restante (precios originales)</p>
              <p className="text-lg font-bold text-gray-700">{formatMoney(totalOldRemaining * (1 + ivaRate))}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Restante (precios nuevos)</p>
              <p className={`text-lg font-bold ${ic(totalImpact)}`}>{formatMoney(totalNewRemaining * (1 + ivaRate))}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Impacto total (c/IVA)</p>
              <p className={`text-lg font-bold ${ic(totalImpact)}`}>
                {sign(totalImpact)}{formatMoney(totalImpact * (1 + ivaRate))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DB selector toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex-wrap">
        <label className="text-sm font-semibold text-amber-800 shrink-0">Base de precios actualizada:</label>
        <select
          value={update.newDatabaseId}
          onChange={(e) => changeBudgetUpdateDatabase(update.id, e.target.value)}
          className="px-3 py-1.5 text-sm border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white min-w-52"
        >
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-amber-700">
          Rubros emparejados por código · los no encontrados mantienen precio original
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {enriched.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm py-16">
            No hay rubros en esta actualización.
          </div>
        ) : (
          <table className="text-sm border-separate border-spacing-0" style={{ tableLayout: 'fixed', width: '100%', minWidth: 900 }}>
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
              <tr>
                {([
                  ['codigo','Código','left',null],['nombre','Nombre','left',null],['unidad','Unidad','left',null],
                  ['cantTotal','Cant. Total','right',null],['avance','% Avance','right','text-amber-600'],
                  ['cantRest','Cant. Rest.','right',null],['pUnitOrig','P.Unit Orig.','right',null],
                  ['pUnitNuevo','P.Unit Nuevo','right','text-blue-600'],['costoOrig','Costo Rest. Orig.','right',null],
                  ['costoNuevo','Costo Rest. Nuevo','right','text-blue-600'],['impacto','Impacto','right',null],
                ] as const).map(([col, label, align, color]) => (
                  <th key={col} style={{ width: widths[col as keyof typeof widths] }} className={`relative px-3 py-3 text-${align} font-medium border-b border-gray-200 ${color ?? ''} select-none`}>
                    <span className="truncate block">{label}</span>
                    {resizer(col as keyof typeof widths)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([key, { categoryName, items }]) => {
                const chOld = items.reduce((s, li) => s + li.oldRemainingCost, 0);
                const chNew = items.reduce((s, li) => s + li.newRemainingCost, 0);
                const chImpact = chNew - chOld;
                const isCollapsed = collapsedChapters.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr
                      className="bg-gray-100 cursor-pointer select-none hover:bg-gray-200 transition-colors"
                      onClick={() => toggleChapter(key)}
                    >
                      <td colSpan={8} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {isCollapsed
                            ? <ChevronRight size={13} className="text-gray-500 shrink-0" />
                            : <ChevronDown size={13} className="text-gray-500 shrink-0" />
                          }
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{categoryName}</span>
                          <span className="text-xs text-gray-400">({items.length} rubro{items.length !== 1 ? 's' : ''})</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700">{formatMoney(chOld)}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">{formatMoney(chNew)}</td>
                      <td className={`px-3 py-2 text-right text-xs font-semibold ${ic(chImpact)}`}>
                        {Math.abs(chImpact) > 0.005 ? sign(chImpact) + formatMoney(chImpact) : '—'}
                      </td>
                    </tr>

                    {!isCollapsed && items.map((li) => (
                      <tr key={li.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{li.rubroCode}</td>
                        <td className="px-3 py-2.5 text-gray-800">
                          {li.rubroName}
                          {!li.matched && (
                            <span className="ml-1.5 text-xs text-amber-500" title="No encontrado en la nueva base">⚠</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{li.rubroUnit}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">
                          {li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(2)}
                        </td>

                        {/* % Avance — editable inline */}
                        <td className="px-3 py-2.5 text-right">
                          {editingId === li.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editingVal}
                                onChange={(e) => setEditingVal(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="w-16 px-1.5 py-0.5 text-sm text-right border border-amber-400 rounded focus:outline-none"
                                autoFocus min="0" max="100" step="1"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${li.progress}%` }} />
                              </div>
                              <button
                                onClick={() => startEdit(li.id, li.progress)}
                                className="text-amber-700 font-semibold hover:underline tabular-nums w-10 text-right text-sm"
                                title="Click para editar % de avance"
                              >
                                {li.progress.toFixed(0)}%
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{li.remainingQty.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatMoney(li.oldUnitCost)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={li.matched ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                              {formatMoney(li.newUnitCost)}
                            </span>
                            {Math.abs(li.priceDiff) > 0.005 && (
                              <span className={`text-xs ${li.priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {li.priceDiff > 0 ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatMoney(li.oldRemainingCost)}</td>
                        <td className="px-3 py-2.5 text-right text-blue-700 font-medium">{formatMoney(li.newRemainingCost)}</td>
                        <td className={`px-3 py-2.5 text-right font-medium ${ic(li.impact)}`}>
                          {Math.abs(li.impact) > 0.005 ? sign(li.impact) + formatMoney(li.impact) : '—'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">Subtotal restante</td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800">{formatMoney(totalOldRemaining)}</td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-blue-700">{formatMoney(totalNewRemaining)}</td>
                <td className={`px-3 py-2.5 text-right text-sm font-semibold ${ic(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005 ? sign(totalImpact) + formatMoney(totalImpact) : '—'}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-1.5 text-right text-xs text-gray-400">IVA ({(ivaRate * 100).toFixed(0)}%)</td>
                <td className="px-3 py-1.5 text-right text-xs text-gray-500">{formatMoney(totalOldRemaining * ivaRate)}</td>
                <td className="px-3 py-1.5 text-right text-xs text-blue-500">{formatMoney(totalNewRemaining * ivaRate)}</td>
                <td className={`px-3 py-1.5 text-right text-xs ${ic(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005 ? sign(totalImpact * ivaRate) + formatMoney(totalImpact * ivaRate) : '—'}
                </td>
              </tr>
              <tr className="bg-amber-50">
                <td colSpan={8} className="px-3 py-3 text-right text-sm font-bold text-gray-800">TOTAL restante (c/IVA)</td>
                <td className="px-3 py-3 text-right text-base font-bold text-gray-800">{formatMoney(totalOldRemaining * (1 + ivaRate))}</td>
                <td className="px-3 py-3 text-right text-base font-bold text-blue-700">{formatMoney(totalNewRemaining * (1 + ivaRate))}</td>
                <td className={`px-3 py-3 text-right text-base font-bold ${ic(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005 ? sign(totalImpact) + formatMoney(totalImpact * (1 + ivaRate)) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
