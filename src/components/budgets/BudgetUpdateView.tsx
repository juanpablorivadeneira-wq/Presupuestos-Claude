import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStore, formatMoney, rubroTotal, rubroBreakdown } from '../../store/useStore';
import { AppView } from '../../types';

interface BudgetUpdateViewProps {
  onNavigate: (view: AppView) => void;
}

export default function BudgetUpdateView({ onNavigate: _onNavigate }: BudgetUpdateViewProps) {
  const budgets = useStore((s) => s.budgets);
  const currentBudgetId = useStore((s) => s.currentBudgetId);
  const databases = useStore((s) => s.databases);
  const { updateLineItemProgress } = useStore();

  const budget = budgets.find((b) => b.id === currentBudgetId) ?? null;
  const ivaRate = budget?.ivaRate ?? 0.12;

  const [newDbId, setNewDbId] = useState<string>(budget?.databaseId ?? databases[0]?.id ?? '');
  const [editingProgressId, setEditingProgressId] = useState<string | null>(null);
  const [editingProgressVal, setEditingProgressVal] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  const newDb = databases.find((d) => d.id === newDbId) ?? null;
  const isSameDb = newDbId === budget?.databaseId;

  // Compute per-line-item comparison
  const enriched = useMemo(() => {
    if (!budget) return [];
    return budget.lineItems.map((li) => {
      const progress = li.progress ?? 0;
      const remainingQty = li.quantity * (1 - progress / 100);
      const oldRemainingCost = li.unitCost * remainingQty;

      let newUnitCost = li.unitCost;
      let newMat = li.materialCost ?? 0;
      let newMO = li.manoDeObraCost ?? 0;
      let newEq = li.equipoCost ?? 0;
      let matched = false;

      if (newDb) {
        const matchedRubro = newDb.rubros.find((r) => r.code === li.rubroCode);
        if (matchedRubro) {
          newUnitCost = rubroTotal(matchedRubro, newDb.items);
          const bd = rubroBreakdown(matchedRubro, newDb.items);
          newMat = bd.material;
          newMO = bd.manoDeObra;
          newEq = bd.equipo;
          matched = true;
        }
      }

      const newRemainingCost = newUnitCost * remainingQty;
      const impact = newRemainingCost - oldRemainingCost;
      const priceDiff = newUnitCost - li.unitCost;

      return { ...li, progress, remainingQty, oldRemainingCost, newUnitCost, newMat, newMO, newEq, matched, newRemainingCost, impact, priceDiff };
    });
  }, [budget, newDb]);

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

  // Summary totals
  const totalOldRemaining = enriched.reduce((s, li) => s + li.oldRemainingCost, 0);
  const totalNewRemaining = enriched.reduce((s, li) => s + li.newRemainingCost, 0);
  const totalImpact = totalNewRemaining - totalOldRemaining;
  const totalBudget = enriched.reduce((s, li) => s + li.unitCost * li.quantity, 0);
  const totalExecuted = enriched.reduce((s, li) => s + li.unitCost * li.quantity * ((li.progress ?? 0) / 100), 0);
  const overallProgress = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;

  function startEditProgress(id: string, current: number) {
    setEditingProgressId(id);
    setEditingProgressVal(String(current));
  }

  function commitProgress() {
    if (!editingProgressId || !budget) { setEditingProgressId(null); return; }
    const val = parseFloat(editingProgressVal);
    if (!isNaN(val)) {
      updateLineItemProgress(budget.id, editingProgressId, Math.max(0, Math.min(100, val)));
    }
    setEditingProgressId(null);
  }

  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function impactColor(val: number) {
    if (val > 0.005) return 'text-red-600';
    if (val < -0.005) return 'text-green-600';
    return 'text-gray-400';
  }

  function impactSign(val: number) {
    return val > 0.005 ? '+' : '';
  }

  if (!budget) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No hay presupuesto abierto.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Info bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Actualización de Precios</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Presupuesto: <span className="text-gray-600 font-medium">{budget.name}</span>
              {' · '}
              Avance general: <span className="font-semibold text-amber-600">{overallProgress.toFixed(1)}%</span>
              {' · '}
              Base original: <span className="text-gray-600">{budget.databaseName}</span>
            </p>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-400">Restante (precios actuales)</p>
              <p className="text-lg font-bold text-gray-700">{formatMoney(totalOldRemaining * (1 + ivaRate))}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Restante (precios nuevos)</p>
              <p className={`text-lg font-bold ${impactColor(totalImpact)}`}>
                {formatMoney(totalNewRemaining * (1 + ivaRate))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Impacto total (c/IVA)</p>
              <p className={`text-lg font-bold ${impactColor(totalImpact)}`}>
                {impactSign(totalImpact)}{formatMoney(totalImpact * (1 + ivaRate))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex-wrap">
        <label className="text-sm font-semibold text-amber-800 shrink-0">Nueva base de precios:</label>
        <select
          value={newDbId}
          onChange={(e) => setNewDbId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white min-w-52"
        >
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.name}{db.id === budget.databaseId ? ' (actual)' : ''}
            </option>
          ))}
        </select>
        <span className="text-xs text-amber-700">
          {isSameDb
            ? 'Selecciona una base diferente para ver el impacto de precios actualizados'
            : `Comparando contra: ${newDb?.name ?? '—'} · rubros emparejados por código`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {enriched.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm py-16">
            No hay rubros en el presupuesto.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left w-28">Código</th>
                <th className="px-3 py-3 text-left">Nombre</th>
                <th className="px-3 py-3 text-left w-16">Unidad</th>
                <th className="px-3 py-3 text-right w-24">Cant. Total</th>
                <th className="px-3 py-3 text-right w-28 text-amber-600">% Avance</th>
                <th className="px-3 py-3 text-right w-24">Cant. Rest.</th>
                <th className="px-3 py-3 text-right w-28">P.Unit Actual</th>
                <th className="px-3 py-3 text-right w-28 text-blue-600">P.Unit Nuevo</th>
                <th className="px-3 py-3 text-right w-32">Costo Rest. Act.</th>
                <th className="px-3 py-3 text-right w-32 text-blue-600">Costo Rest. Nuevo</th>
                <th className="px-3 py-3 text-right w-28">Impacto</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([key, { categoryName, items }]) => {
                const chOldRem = items.reduce((s, li) => s + li.oldRemainingCost, 0);
                const chNewRem = items.reduce((s, li) => s + li.newRemainingCost, 0);
                const chImpact = chNewRem - chOldRem;
                const isCollapsed = collapsedChapters.has(key);
                return (
                  <React.Fragment key={key}>
                    {/* Chapter header */}
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
                      <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700">{formatMoney(chOldRem)}</td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">{formatMoney(chNewRem)}</td>
                      <td className={`px-3 py-2 text-right text-xs font-semibold ${impactColor(chImpact)}`}>
                        {Math.abs(chImpact) > 0.005 ? impactSign(chImpact) + formatMoney(chImpact) : '—'}
                      </td>
                    </tr>

                    {/* Line items */}
                    {!isCollapsed && items.map((li) => (
                      <tr key={li.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{li.rubroCode}</td>
                        <td className="px-3 py-2.5 text-gray-800">
                          <span>{li.rubroName}</span>
                          {!li.matched && !isSameDb && (
                            <span className="ml-1.5 text-xs text-amber-500" title="No encontrado en nueva base — se mantiene precio original">⚠ sin match</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{li.rubroUnit}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">
                          {li.quantity % 1 === 0 ? li.quantity : li.quantity.toFixed(2)}
                        </td>

                        {/* % Avance — editable */}
                        <td className="px-3 py-2.5 text-right">
                          {editingProgressId === li.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editingProgressVal}
                                onChange={(e) => setEditingProgressVal(e.target.value)}
                                onBlur={commitProgress}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitProgress();
                                  if (e.key === 'Escape') setEditingProgressId(null);
                                }}
                                className="w-16 px-1.5 py-0.5 text-sm text-right border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                                autoFocus
                                min="0"
                                max="100"
                                step="1"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Progress bar mini */}
                              <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full bg-amber-400"
                                  style={{ width: `${li.progress}%` }}
                                />
                              </div>
                              <button
                                onClick={() => startEditProgress(li.id, li.progress)}
                                className="text-amber-700 font-semibold hover:underline tabular-nums text-sm w-10 text-right"
                                title="Click para editar % de avance"
                              >
                                {li.progress.toFixed(0)}%
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">
                          {li.remainingQty.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatMoney(li.unitCost)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className={li.matched && !isSameDb ? 'text-blue-700 font-medium' : 'text-gray-700'}>
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
                        <td className={`px-3 py-2.5 text-right font-medium ${impactColor(li.impact)}`}>
                          {Math.abs(li.impact) > 0.005 ? impactSign(li.impact) + formatMoney(li.impact) : '—'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">
                  Subtotal restante
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800">{formatMoney(totalOldRemaining)}</td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-blue-700">{formatMoney(totalNewRemaining)}</td>
                <td className={`px-3 py-2.5 text-right text-sm font-semibold ${impactColor(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005 ? impactSign(totalImpact) + formatMoney(totalImpact) : '—'}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-1.5 text-right text-xs text-gray-400">
                  IVA ({(ivaRate * 100).toFixed(0)}%)
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-gray-500">{formatMoney(totalOldRemaining * ivaRate)}</td>
                <td className="px-3 py-1.5 text-right text-xs text-blue-500">{formatMoney(totalNewRemaining * ivaRate)}</td>
                <td className={`px-3 py-1.5 text-right text-xs ${impactColor(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005 ? impactSign(totalImpact * ivaRate) + formatMoney(totalImpact * ivaRate) : '—'}
                </td>
              </tr>
              <tr className="bg-amber-50">
                <td colSpan={8} className="px-3 py-3 text-right text-sm font-bold text-gray-800">
                  TOTAL restante (c/IVA)
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-gray-800">
                  {formatMoney(totalOldRemaining * (1 + ivaRate))}
                </td>
                <td className="px-3 py-3 text-right text-base font-bold text-blue-700">
                  {formatMoney(totalNewRemaining * (1 + ivaRate))}
                </td>
                <td className={`px-3 py-3 text-right text-base font-bold ${impactColor(totalImpact)}`}>
                  {Math.abs(totalImpact) > 0.005
                    ? impactSign(totalImpact) + formatMoney(totalImpact * (1 + ivaRate))
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
