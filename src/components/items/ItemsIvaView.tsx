import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Item } from '../../types';
import { itemBase, formatMoney } from '../../store/useStore';

interface ItemsIvaViewProps {
  items: Item[];
}

export default function ItemsIvaView({ items }: ItemsIvaViewProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Group by IVA rate, sorted ascending
  const groups = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const item of filteredItems) {
      const rate = item.ivaRate ?? 0;
      if (!map.has(rate)) map.set(rate, []);
      map.get(rate)!.push(item);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filteredItems]);

  // Grand totals across all groups
  const grandBase = filteredItems.reduce((s, i) => s + itemBase(i), 0);
  const grandIva = filteredItems.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);
  const grandTotal = grandBase + grandIva;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ítem..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-4 ml-auto text-xs text-gray-500">
          <span>{filteredItems.length} items</span>
          <span className="text-gray-300">|</span>
          <span>Base: <span className="font-medium text-gray-700">{formatMoney(grandBase)}</span></span>
          <span>IVA: <span className="font-medium text-amber-600">{formatMoney(grandIva)}</span></span>
          <span>Total: <span className="font-bold text-green-700">{formatMoney(grandTotal)}</span></span>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No se encontraron items
          </div>
        )}

        {groups.map(([rate, groupItems]) => {
          const groupBase = groupItems.reduce((s, i) => s + itemBase(i), 0);
          const groupIva = groupItems.reduce((s, i) => s + itemBase(i) * rate, 0);
          const groupTotal = groupBase + groupIva;
          const pct = (rate * 100).toFixed(0);
          const isExento = rate === 0;

          return (
            <div key={rate} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      isExento
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    IVA {pct}%{isExento ? ' — Exento' : ''}
                  </span>
                  <span className="text-sm text-gray-500">{groupItems.length} items</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Base: <span className="font-medium text-gray-700">{formatMoney(groupBase)}</span></span>
                  <span>IVA: <span className={`font-medium ${isExento ? 'text-gray-400' : 'text-amber-600'}`}>{formatMoney(groupIva)}</span></span>
                  <span>Total: <span className="font-bold text-green-700">{formatMoney(groupTotal)}</span></span>
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-gray-400 border-b border-gray-100 bg-white">
                    <th className="px-4 py-2 text-left">Código</th>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-center">Unidad</th>
                    <th className="px-4 py-2 text-right">Base (sin IVA)</th>
                    <th className="px-4 py-2 text-right">IVA {pct}%</th>
                    <th className="px-4 py-2 text-right">Precio c/IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {groupItems.map((item) => {
                    const base = itemBase(item);
                    const iva = base * rate;
                    const total = base + iva;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-gray-400">{item.code || '—'}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-center text-gray-500 text-xs">{item.unit}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatMoney(base)}</td>
                        <td className="px-4 py-2 text-right">
                          {iva > 0
                            ? <span className="text-amber-600">{formatMoney(iva)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-green-700">{formatMoney(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Group subtotal row */}
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-600">
                    <td colSpan={3} className="px-4 py-2 text-right text-gray-400 font-normal">Subtotal grupo IVA {pct}%</td>
                    <td className="px-4 py-2 text-right">{formatMoney(groupBase)}</td>
                    <td className="px-4 py-2 text-right text-amber-600">{formatMoney(groupIva)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{formatMoney(groupTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* Grand total */}
        {groups.length > 1 && (
          <div className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-sm font-semibold text-gray-700">TOTAL GENERAL ({groups.length} grupos IVA)</span>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-500">Base: <span className="font-semibold text-gray-800">{formatMoney(grandBase)}</span></span>
              <span className="text-amber-600">IVA: <span className="font-semibold">{formatMoney(grandIva)}</span></span>
              <span className="text-green-700 text-base font-bold">{formatMoney(grandTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
