import { useMemo, useState } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Item, ItemCategory } from '../../types';
import { itemBase, formatMoney } from '../../store/useStore';

interface ItemsIvaViewProps {
  items: Item[];
  categories: ItemCategory[];
}

// Build the full ancestor path for a category (root first)
function getCategoryPath(catId: string | null, categories: ItemCategory[]): ItemCategory[] {
  if (!catId) return [];
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return [];
  return [...getCategoryPath(cat.parentId, categories), cat];
}

// Get top-level (root) category for an item
function getRootCategory(item: Item, categories: ItemCategory[]): ItemCategory | null {
  const path = getCategoryPath(item.categoryId, categories);
  return path[0] ?? null;
}

interface CategoryGroup {
  cat: ItemCategory;
  items: Item[];
}

interface RateGroup {
  rate: number;
  categoryGroups: CategoryGroup[];
  uncategorized: Item[];
}

function buildRateGroups(items: Item[], categories: ItemCategory[]): RateGroup[] {
  // Step 1: group by IVA rate
  const byRate = new Map<number, Item[]>();
  for (const item of items) {
    const rate = item.ivaRate ?? 0;
    if (!byRate.has(rate)) byRate.set(rate, []);
    byRate.get(rate)!.push(item);
  }

  // Step 2: within each rate, group by root category
  return [...byRate.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, rateItems]) => {
      const byCat = new Map<string, Item[]>();
      const uncategorized: Item[] = [];

      for (const item of rateItems) {
        const root = getRootCategory(item, categories);
        if (!root) { uncategorized.push(item); continue; }
        if (!byCat.has(root.id)) byCat.set(root.id, []);
        byCat.get(root.id)!.push(item);
      }

      const categoryGroups: CategoryGroup[] = [...byCat.entries()].map(([catId, catItems]) => ({
        cat: categories.find((c) => c.id === catId)!,
        items: catItems,
      }));

      return { rate, categoryGroups, uncategorized };
    });
}

interface CatGroupRowsProps {
  group: CategoryGroup;
  categories: ItemCategory[];
}

function CatGroupRows({ group, categories }: CatGroupRowsProps) {
  const [open, setOpen] = useState(true);
  const base = group.items.reduce((s, i) => s + itemBase(i), 0);
  const iva = group.items.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);

  return (
    <>
      <tr
        className="bg-gray-50 border-b border-gray-100 cursor-pointer select-none hover:bg-gray-100"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-1.5 pr-3 pl-10">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {open ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
            {group.cat.name}
            <span className="font-normal text-gray-400">({group.items.length})</span>
          </span>
        </td>
        <td className="py-1.5 px-3 text-right text-xs text-gray-500">{formatMoney(base)}</td>
        <td className="py-1.5 px-3 text-right text-xs text-amber-500">{iva > 0 ? formatMoney(iva) : <span className="text-gray-300">—</span>}</td>
        <td className="py-1.5 px-3 text-right text-xs font-medium text-green-700">{formatMoney(base + iva)}</td>
      </tr>

      {open && group.items.map((item) => {
        const b = itemBase(item);
        const iv = b * (item.ivaRate ?? 0);
        const path = getCategoryPath(item.categoryId, categories);
        const subPath = path.slice(1).map((c) => c.name).join(' › ');
        return (
          <tr key={item.id} className="hover:bg-amber-50 border-b border-gray-50 transition-colors">
            <td className="py-2 pr-3 pl-16">
              <div className="text-xs text-gray-800">{item.name}</div>
              {subPath && <div className="text-xs text-gray-400">{subPath}</div>}
              {item.code && <div className="font-mono text-xs text-gray-400">{item.code}</div>}
            </td>
            <td className="py-2 px-3 text-right text-xs text-gray-600">{formatMoney(b)}</td>
            <td className="py-2 px-3 text-right text-xs">
              {iv > 0 ? <span className="text-amber-600">{formatMoney(iv)}</span> : <span className="text-gray-300">—</span>}
            </td>
            <td className="py-2 px-3 text-right text-xs font-semibold text-green-700">{formatMoney(b + iv)}</td>
          </tr>
        );
      })}
    </>
  );
}

interface RateGroupBlockProps {
  group: RateGroup;
  categories: ItemCategory[];
}

function RateGroupBlock({ group, categories }: RateGroupBlockProps) {
  const [open, setOpen] = useState(true);
  const allItems = [...group.categoryGroups.flatMap((g) => g.items), ...group.uncategorized];
  const totalBase = allItems.reduce((s, i) => s + itemBase(i), 0);
  const totalIva = allItems.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);
  const pct = (group.rate * 100).toFixed(0);
  const isExento = group.rate === 0;

  return (
    <>
      {/* Rate header */}
      <tr
        className={`cursor-pointer select-none border-b-2 ${isExento ? 'bg-gray-100 border-gray-300' : 'bg-amber-50 border-amber-300'}`}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-2.5 pr-3 pl-4">
          <span className="flex items-center gap-2">
            {open ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isExento ? 'bg-gray-200 text-gray-600' : 'bg-amber-200 text-amber-800'}`}>
              IVA {pct}%{isExento ? ' — Exento' : ''}
            </span>
            <span className="text-xs text-gray-500">{allItems.length} items</span>
          </span>
        </td>
        <td className="py-2.5 px-3 text-right text-sm font-medium text-gray-700">{formatMoney(totalBase)}</td>
        <td className="py-2.5 px-3 text-right text-sm font-medium text-amber-600">{totalIva > 0 ? formatMoney(totalIva) : <span className="text-gray-400">—</span>}</td>
        <td className="py-2.5 px-3 text-right text-sm font-bold text-green-700">{formatMoney(totalBase + totalIva)}</td>
      </tr>

      {open && (
        <>
          {group.categoryGroups.map((cg) => (
            <CatGroupRows key={cg.cat.id} group={cg} categories={categories} />
          ))}
          {group.uncategorized.map((item) => {
            const b = itemBase(item);
            const iv = b * (item.ivaRate ?? 0);
            return (
              <tr key={item.id} className="hover:bg-amber-50 border-b border-gray-50">
                <td className="py-2 pr-3 pl-10 text-xs text-gray-500 italic">{item.name} <span className="text-gray-400">(sin categoría)</span></td>
                <td className="py-2 px-3 text-right text-xs text-gray-600">{formatMoney(b)}</td>
                <td className="py-2 px-3 text-right text-xs">{iv > 0 ? <span className="text-amber-600">{formatMoney(iv)}</span> : <span className="text-gray-300">—</span>}</td>
                <td className="py-2 px-3 text-right text-xs font-semibold text-green-700">{formatMoney(b + iv)}</td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
}

export default function ItemsIvaView({ items, categories }: ItemsIvaViewProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
  }, [items, search]);

  const rateGroups = useMemo(() => buildRateGroups(filteredItems, categories), [filteredItems, categories]);

  const grandBase = filteredItems.reduce((s, i) => s + itemBase(i), 0);
  const grandIva = filteredItems.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-amber-200 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ítem..."
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <span>{filteredItems.length} items · {rateGroups.length} tasas IVA</span>
          <span className="text-gray-300">|</span>
          <span>Base: <span className="font-medium text-gray-700">{formatMoney(grandBase)}</span></span>
          <span>IVA: <span className="font-medium text-amber-600">{formatMoney(grandIva)}</span></span>
          <span>Total: <span className="font-bold text-green-700">{formatMoney(grandBase + grandIva)}</span></span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasa IVA / Categoría / Ítem</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-32">Base</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-amber-600 uppercase w-32">IVA</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-green-700 uppercase w-32">Total c/IVA</th>
            </tr>
          </thead>
          <tbody>
            {rateGroups.map((rg) => (
              <RateGroupBlock key={rg.rate} group={rg} categories={categories} />
            ))}

            {rateGroups.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">No se encontraron items</td>
              </tr>
            )}

            {/* Grand total */}
            <tr className="border-t-2 border-gray-400 bg-white sticky bottom-0">
              <td className="px-4 py-3 text-sm font-bold text-gray-800">TOTAL GENERAL</td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-gray-700">{formatMoney(grandBase)}</td>
              <td className="px-3 py-3 text-right text-sm font-semibold text-amber-600">{formatMoney(grandIva)}</td>
              <td className="px-3 py-3 text-right text-sm font-bold text-green-700">{formatMoney(grandBase + grandIva)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
