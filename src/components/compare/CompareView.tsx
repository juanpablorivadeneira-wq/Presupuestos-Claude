import { useState, useMemo } from 'react';
import { X, FileDown } from 'lucide-react';
import { useStore, formatMoney } from '../../store/useStore';
import { Budget } from '../../types';
import { exportCompareExcel } from '../../utils/exportExcel';

interface CompareViewProps {
  onNavigate: (view: import('../../types').AppView) => void;
}

export default function CompareView({ onNavigate: _onNavigate }: CompareViewProps) {
  const budgets = useStore((s) => s.budgets);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedBudgets = useMemo(
    () => selectedIds.map((id) => budgets.find((b) => b.id === id)).filter(Boolean) as Budget[],
    [selectedIds, budgets]
  );

  function toggleBudget(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    );
  }

  // Build comparison table: rows indexed by rubroCode
  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const b of selectedBudgets) {
      for (const li of b.lineItems) set.add(li.rubroCode);
    }
    return Array.from(set);
  }, [selectedBudgets]);

  // For each row, find min and max total across budgets
  function rowTotals(code: string): number[] {
    return selectedBudgets.map((b) => {
      const li = b.lineItems.find((l) => l.rubroCode === code);
      return li ? li.unitCost * li.quantity : 0;
    });
  }

  const budgetTotals = useMemo(
    () => selectedBudgets.map((b) => b.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0)),
    [selectedBudgets]
  );

  const minTotal = Math.min(...budgetTotals);
  const maxTotal = Math.max(...budgetTotals);

  function cellColorClass(value: number, values: number[]): string {
    const nonZero = values.filter((v) => v > 0);
    if (nonZero.length <= 1 || value === 0) return '';
    const min = Math.min(...nonZero);
    const max = Math.max(...nonZero);
    if (value === min) return 'bg-green-50 text-green-700 font-semibold';
    if (value === max) return 'bg-red-50 text-red-700 font-semibold';
    return '';
  }


  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Budget selector */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Seleccionar Presupuestos (máx. 4)
          </h3>
          {selectedBudgets.length >= 2 && (
            <button
              onClick={() =>
                exportCompareExcel(
                  selectedBudgets.map((b) => ({
                    name: b.name,
                    lineItems: b.lineItems,
                  }))
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <FileDown size={14} />
              Exportar Comparativo
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => {
            const active = selectedIds.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => toggleBudget(b.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  active
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {b.name}
                {active && <X size={12} />}
              </button>
            );
          })}
        </div>
        {budgets.length === 0 && (
          <p className="text-sm text-gray-400">No hay presupuestos creados.</p>
        )}
      </div>

      {selectedBudgets.length < 2 ? (
        <div className="text-center text-gray-400 text-sm py-16">
          Selecciona al menos 2 presupuestos para comparar.
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-32">Código</th>
                  <th className="px-4 py-3 text-left font-medium">Descripción</th>
                  {selectedBudgets.map((b) => (
                    <th key={b.id} className="px-3 py-3 text-right font-medium whitespace-nowrap" colSpan={3}>
                      {b.name}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium">% Dif.</th>
                </tr>
                <tr className="bg-gray-100 text-xs text-gray-400">
                  <th className="px-4 py-1" />
                  <th className="px-4 py-1" />
                  {selectedBudgets.map((b) => (
                    <>
                      <th key={`${b.id}-pu`} className="px-3 py-1 text-right font-normal">P.Unit</th>
                      <th key={`${b.id}-qt`} className="px-3 py-1 text-right font-normal">Cant</th>
                      <th key={`${b.id}-tt`} className="px-3 py-1 text-right font-normal">Total</th>
                    </>
                  ))}
                  <th className="px-3 py-1" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allCodes.map((code) => {
                  const totals = rowTotals(code);
                  let description = '';
                  let unit = '';
                  for (const b of selectedBudgets) {
                    const li = b.lineItems.find((l) => l.rubroCode === code);
                    if (li) { description = li.rubroName; unit = li.rubroUnit; break; }
                  }
                  const nonZeroTotals = totals.filter((v) => v > 0);
                  const maxDiff = nonZeroTotals.length > 1
                    ? ((Math.max(...nonZeroTotals) - Math.min(...nonZeroTotals)) / Math.min(...nonZeroTotals) * 100).toFixed(1) + '%'
                    : '—';

                  return (
                    <tr key={code} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{code}</td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {description}
                        {unit && <span className="ml-1 text-xs text-gray-400">({unit})</span>}
                      </td>
                      {selectedBudgets.map((b) => {
                        const li = b.lineItems.find((l) => l.rubroCode === code);
                        const rowTotal = li ? li.unitCost * li.quantity : 0;
                        const colorClass = cellColorClass(rowTotal, totals);
                        return (
                          <>
                            <td key={`${b.id}-pu`} className={`px-3 py-2.5 text-right text-xs ${colorClass}`}>
                              {li ? formatMoney(li.unitCost) : '—'}
                            </td>
                            <td key={`${b.id}-qt`} className={`px-3 py-2.5 text-right text-xs ${colorClass}`}>
                              {li ? li.quantity : '—'}
                            </td>
                            <td key={`${b.id}-tt`} className={`px-3 py-2.5 text-right text-xs ${colorClass}`}>
                              {li ? formatMoney(rowTotal) : '—'}
                            </td>
                          </>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right text-xs text-gray-500">{maxDiff}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-right text-gray-700">TOTAL</td>
                  {selectedBudgets.map((b, _bi) => {
                    const t = budgetTotals[selectedBudgets.indexOf(b)];
                    const isMin = selectedBudgets.length > 1 && t === minTotal && minTotal !== maxTotal;
                    const isMax = selectedBudgets.length > 1 && t === maxTotal && minTotal !== maxTotal;
                    const colorClass = isMin
                      ? 'text-green-700'
                      : isMax
                      ? 'text-red-700'
                      : 'text-gray-700';
                    return (
                      <>
                        <td key={`${b.id}-fpu`} />
                        <td key={`${b.id}-fqt`} />
                        <td key={`${b.id}-ftt`} className={`px-3 py-3 text-right ${colorClass}`}>
                          {formatMoney(t)}
                        </td>
                      </>
                    );
                  })}
                  <td className="px-3 py-3 text-right text-xs text-gray-500">
                    {selectedBudgets.length > 1 && minTotal !== maxTotal
                      ? `+${(((maxTotal - minTotal) / minTotal) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
