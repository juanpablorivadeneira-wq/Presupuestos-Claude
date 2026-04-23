import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Item, ItemCategory } from '../../types';
import { itemBase, formatMoney, getCategoryIds } from '../../store/useStore';

interface ItemsIvaViewProps {
  items: Item[];
  categories: ItemCategory[];
  selectedCategoryId: string | null;
}

export default function ItemsIvaView({ items, categories, selectedCategoryId }: ItemsIvaViewProps) {
  const [search, setSearch] = useState('');
  const [selectedRate, setSelectedRate] = useState<number | null>(null); // null = todos

  // Apply category filter from sidebar
  const categoryFiltered = useMemo(() => {
    if (!selectedCategoryId) return items;
    const ids = getCategoryIds(selectedCategoryId, categories);
    return items.filter((i) => i.categoryId !== null && ids.includes(i.categoryId));
  }, [items, categories, selectedCategoryId]);

  // Apply search
  const searched = useMemo(() => {
    if (!search.trim()) return categoryFiltered;
    const q = search.toLowerCase();
    return categoryFiltered.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [categoryFiltered, search]);

  // All distinct rates in the current dataset
  const rates = useMemo(() => {
    const set = new Set(searched.map((i) => i.ivaRate ?? 0));
    return [...set].sort((a, b) => a - b);
  }, [searched]);

  // Apply rate filter
  const filtered = useMemo(() => {
    if (selectedRate === null) return searched;
    return searched.filter((i) => (i.ivaRate ?? 0) === selectedRate);
  }, [searched, selectedRate]);

  // Totals for current filter
  const totalBase = filtered.reduce((s, i) => s + itemBase(i), 0);
  const totalIva  = filtered.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);

  // Summary per rate (always shown, regardless of active filter)
  const rateSummary = useMemo(() =>
    rates.map((r) => {
      const rItems = searched.filter((i) => (i.ivaRate ?? 0) === r);
      const base = rItems.reduce((s, i) => s + itemBase(i), 0);
      const iva  = rItems.reduce((s, i) => s + itemBase(i) * r, 0);
      return { rate: r, count: rItems.length, base, iva, total: base + iva };
    }),
  [rates, searched]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── IVA rate filter bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0 overflow-x-auto">
        <span className="text-xs text-amber-700 font-medium shrink-0">Tasa IVA:</span>

        {/* "Todos" chip */}
        <button
          onClick={() => setSelectedRate(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            selectedRate === null
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Todos ({searched.length})
        </button>

        {rateSummary.map(({ rate, count }) => {
          const pct = (rate * 100).toFixed(0);
          const active = selectedRate === rate;
          return (
            <button
              key={rate}
              onClick={() => setSelectedRate(active ? null : rate)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                active
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {pct}%{rate === 0 ? ' Exento' : ''} ({count})
            </button>
          );
        })}

        {/* Search */}
        <div className="relative ml-auto shrink-0 w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-6 py-1 text-xs border border-amber-200 rounded-full bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No hay ítems para esta selección
          </div>
        ) : (
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">Nombre</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-28">Código</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-36">Categoría</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-amber-600 uppercase tracking-wide border-b border-gray-200 w-20">IVA %</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-28">Base</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-amber-600 uppercase tracking-wide border-b border-gray-200 w-28">Monto IVA</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-green-700 uppercase tracking-wide border-b border-gray-200 w-28">Total c/IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => {
                const base = itemBase(item);
                const rate = item.ivaRate ?? 0;
                const iva  = base * rate;
                const pct  = (rate * 100).toFixed(0);
                // Find root category name
                const catPath: string[] = [];
                let cId = item.categoryId;
                while (cId) {
                  const cat = categories.find((c) => c.id === cId);
                  if (!cat) break;
                  catPath.unshift(cat.name);
                  cId = cat.parentId;
                }
                const rootCat = catPath[0] ?? '';
                const subCat  = catPath.slice(1).join(' › ');

                return (
                  <tr key={item.id} className="hover:bg-amber-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.unit && <div className="text-xs text-gray-400">{item.unit}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{item.code || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium text-gray-700">{rootCat}</div>
                      {subCat && <div className="text-xs text-gray-400">{subCat}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rate === 0 ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm text-gray-600">{formatMoney(base)}</td>
                    <td className="px-3 py-2.5 text-right text-sm">
                      {iva > 0 ? <span className="text-amber-600">{formatMoney(iva)}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-green-700">{formatMoney(base + iva)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer totals ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center gap-6 text-xs">
        <span className="text-gray-500">{filtered.length} ítems</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-600">Base: <span className="font-semibold text-gray-800">{formatMoney(totalBase)}</span></span>
        <span className="text-amber-600">IVA: <span className="font-semibold">{formatMoney(totalIva)}</span></span>
        <span className="text-green-700 font-bold text-sm">{formatMoney(totalBase + totalIva)}</span>

        {/* Per-rate mini summary */}
        {selectedRate === null && rateSummary.length > 1 && (
          <>
            <span className="text-gray-300 ml-auto">|</span>
            {rateSummary.map(({ rate, iva, total }) => (
              <span key={rate} className="text-gray-500">
                {(rate * 100).toFixed(0)}%: <span className="font-medium text-amber-600">{formatMoney(iva)}</span>
                {' '}→ <span className="font-medium text-green-700">{formatMoney(total)}</span>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
