import { useMemo, useState } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Item, ItemCategory } from '../../types';
import { itemBase, formatMoney } from '../../store/useStore';

interface ItemsIvaViewProps {
  items: Item[];
  categories: ItemCategory[];
}

interface CategoryNode {
  cat: ItemCategory;
  children: CategoryNode[];
  items: Item[];
}

function buildTree(categories: ItemCategory[], items: Item[], parentId: string | null): CategoryNode[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((cat) => ({
      cat,
      children: buildTree(categories, items, cat.id),
      items: items.filter((i) => i.categoryId === cat.id),
    }))
    .filter((node) => node.items.length > 0 || node.children.length > 0);
}

function allItemsInNode(node: CategoryNode): Item[] {
  return [...node.items, ...node.children.flatMap(allItemsInNode)];
}

interface NodeRowsProps {
  node: CategoryNode;
  depth: number;
}

function NodeRows({ node, depth }: NodeRowsProps) {
  const [open, setOpen] = useState(true);
  const allItems = allItemsInNode(node);
  const groupBase = allItems.reduce((s, i) => s + itemBase(i), 0);
  const groupIva = allItems.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);
  const groupTotal = groupBase + groupIva;
  const hasChildren = node.children.length > 0;
  const paddingLeft = 16 + depth * 20;

  return (
    <>
      {/* Category header row */}
      <tr className={`border-b border-gray-100 ${depth === 0 ? 'bg-gray-100' : 'bg-gray-50'}`}>
        <td
          className="py-2 pr-3 font-semibold text-gray-700 cursor-pointer select-none"
          style={{ paddingLeft }}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5">
            {(hasChildren || node.items.length > 0) && (
              open ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />
            )}
            <span className={`text-xs uppercase tracking-wide ${depth === 0 ? 'text-gray-700' : 'text-gray-500'}`}>
              {node.cat.name}
            </span>
            <span className="text-xs font-normal text-gray-400 ml-1">({allItems.length})</span>
          </span>
        </td>
        <td className="py-2 px-3 text-right text-xs text-gray-500">{formatMoney(groupBase)}</td>
        <td className="py-2 px-3 text-right text-xs text-amber-600">{groupIva > 0 ? formatMoney(groupIva) : <span className="text-gray-300">—</span>}</td>
        <td className="py-2 px-3 text-right text-xs font-semibold text-green-700">{formatMoney(groupTotal)}</td>
      </tr>

      {open && (
        <>
          {/* Direct items in this category */}
          {node.items.map((item) => {
            const base = itemBase(item);
            const iva = base * (item.ivaRate ?? 0);
            const total = base + iva;
            const pct = ((item.ivaRate ?? 0) * 100).toFixed(0);
            return (
              <tr key={item.id} className="hover:bg-amber-50 border-b border-gray-50 transition-colors">
                <td className="py-2 pr-3" style={{ paddingLeft: paddingLeft + 20 }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-800">{item.name}</span>
                    <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${(item.ivaRate ?? 0) === 0 ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700'}`}>
                      {pct}%
                    </span>
                  </div>
                  {item.code && <div className="text-xs text-gray-400 font-mono ml-0">{item.code}</div>}
                </td>
                <td className="py-2 px-3 text-right text-xs text-gray-600">{formatMoney(base)}</td>
                <td className="py-2 px-3 text-right text-xs">
                  {iva > 0 ? <span className="text-amber-600">{formatMoney(iva)}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-2 px-3 text-right text-xs font-semibold text-green-700">{formatMoney(total)}</td>
              </tr>
            );
          })}
          {/* Subcategories */}
          {node.children.map((child) => (
            <NodeRows key={child.cat.id} node={child} depth={depth + 1} />
          ))}
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

  const tree = useMemo(() => buildTree(categories, filteredItems, null), [categories, filteredItems]);

  // Items with no category
  const uncategorized = filteredItems.filter((i) => !i.categoryId);

  const grandBase = filteredItems.reduce((s, i) => s + itemBase(i), 0);
  const grandIva = filteredItems.reduce((s, i) => s + itemBase(i) * (i.ivaRate ?? 0), 0);
  const grandTotal = grandBase + grandIva;

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
          <span>{filteredItems.length} items</span>
          <span className="text-gray-300">|</span>
          <span>Base: <span className="font-medium text-gray-700">{formatMoney(grandBase)}</span></span>
          <span>IVA: <span className="font-medium text-amber-600">{formatMoney(grandIva)}</span></span>
          <span>Total: <span className="font-bold text-green-700">{formatMoney(grandTotal)}</span></span>
        </div>
      </div>

      {/* Tree table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría / Ítem</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Base</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-amber-600 uppercase tracking-wide w-32">IVA</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-green-700 uppercase tracking-wide w-32">Total c/IVA</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((node) => (
              <NodeRows key={node.cat.id} node={node} depth={0} />
            ))}

            {uncategorized.length > 0 && uncategorized.map((item) => {
              const base = itemBase(item);
              const iva = base * (item.ivaRate ?? 0);
              return (
                <tr key={item.id} className="hover:bg-amber-50 border-b border-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 italic">{item.name} <span className="text-gray-400">(sin categoría)</span></td>
                  <td className="px-3 py-2 text-right text-xs text-gray-600">{formatMoney(base)}</td>
                  <td className="px-3 py-2 text-right text-xs text-amber-600">{iva > 0 ? formatMoney(iva) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-green-700">{formatMoney(base + iva)}</td>
                </tr>
              );
            })}

            {/* Grand total */}
            <tr className="border-t-2 border-gray-300 bg-white sticky bottom-0">
              <td className="px-4 py-2.5 text-sm font-bold text-gray-800">TOTAL GENERAL</td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">{formatMoney(grandBase)}</td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-amber-600">{formatMoney(grandIva)}</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-green-700">{formatMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {tree.length === 0 && uncategorized.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            No se encontraron items
          </div>
        )}
      </div>
    </div>
  );
}
