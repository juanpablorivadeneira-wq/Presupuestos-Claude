import React, { useState } from 'react';
import { ArrowUpDown, Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { Item, ItemCategory, SortConfig } from '../../types';
import { itemTotal, formatMoney, getCategoryIds } from '../../store/useStore';
import { useResizableColumns } from '../shared/useResizableColumns.tsx';

interface ItemTableProps {
  items: Item[];
  categories: ItemCategory[];
  selectedCategoryId: string | null;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
}

interface ColumnHeaderProps {
  label: string;
  colKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  width?: number;
  resizer?: React.ReactNode;
  align?: 'left' | 'right';
}

function ColumnHeader({ label, colKey, sortConfig, onSort, className = '', width, resizer, align = 'left' }: ColumnHeaderProps) {
  const isActive = sortConfig.key === colKey;
  return (
    <th
      style={width ? { width } : undefined}
      className={`relative px-3 py-3 text-${align} text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap border-b border-gray-200 ${className}`}
      onClick={() => onSort(colKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={12} className={isActive && sortConfig.direction ? 'text-green-600' : 'text-gray-300'} />
      </div>
      {resizer}
    </th>
  );
}

// Detect which cost type a category represents based on its name
function detectCategoryType(
  categoryId: string | null,
  categories: ItemCategory[]
): 'material' | 'manoDeObra' | 'equipo' | 'all' {
  if (!categoryId) return 'all';
  const ids = getCategoryIds(categoryId, categories);
  // Walk up to find root category name
  const rootIds = new Set(ids);
  for (const cat of categories) {
    if (!rootIds.has(cat.id)) continue;
    const n = cat.name.toLowerCase();
    if (n.includes('mano') || n.includes('obra') || n.includes('labor')) return 'manoDeObra';
    if (n.includes('equipo') || n.includes('equipment') || n.includes('maquinaria')) return 'equipo';
    if (n.includes('material') || n.includes('obra gris') || n.includes('acabado') || n.includes('instalac') || n.includes('herramienta')) return 'material';
  }
  return 'all';
}

export default function ItemTable({
  items,
  categories,
  selectedCategoryId,
  onEdit,
  onDelete,
  sortConfig,
  onSort,
}: ItemTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { widths, resizer } = useResizableColumns({ codigo: 128, nombre: 280, unidad: 80, material: 110, manoObra: 110, equipo: 96, precioUnit: 112 });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const colType = detectCategoryType(selectedCategoryId, categories);
  const showMat = colType === 'all' || colType === 'material';
  const showMO  = colType === 'all' || colType === 'manoDeObra';
  const showEq  = colType === 'all' || colType === 'equipo';

  const colSpanTotal = 5 + (showMat ? 1 : 0) + (showMO ? 1 : 0) + (showEq ? 1 : 0);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
        No se encontraron items
      </div>
    );
  }

  const totalTableWidth = 32 + widths.codigo + widths.nombre + widths.unidad +
    (showMat ? widths.material : 0) + (showMO ? widths.manoObra : 0) + (showEq ? widths.equipo : 0) +
    widths.precioUnit + 80;

  return (
    <table className="border-separate border-spacing-0" style={{ tableLayout: 'fixed', width: Math.max(totalTableWidth, 600) }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-2 border-b border-gray-200" style={{ width: 32 }}></th>
            <ColumnHeader label="Código" colKey="code" sortConfig={sortConfig} onSort={onSort} width={widths.codigo} resizer={resizer('codigo')} />
            <ColumnHeader label="Nombre" colKey="name" sortConfig={sortConfig} onSort={onSort} width={widths.nombre} resizer={resizer('nombre')} />
            <ColumnHeader label="Unidad" colKey="unit" sortConfig={sortConfig} onSort={onSort} width={widths.unidad} resizer={resizer('unidad')} />
            {showMat && <ColumnHeader label="Material" colKey="material" sortConfig={sortConfig} onSort={onSort} width={widths.material} resizer={resizer('material')} align="right" />}
            {showMO  && <ColumnHeader label="Mano de Obra" colKey="manoDeObra" sortConfig={sortConfig} onSort={onSort} width={widths.manoObra} resizer={resizer('manoObra')} align="right" />}
            {showEq  && <ColumnHeader label="Equipo" colKey="equipo" sortConfig={sortConfig} onSort={onSort} width={widths.equipo} resizer={resizer('equipo')} align="right" />}
            <ColumnHeader label="Precio Unit." colKey="total" sortConfig={sortConfig} onSort={onSort} width={widths.precioUnit} resizer={resizer('precioUnit')} align="right" />
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase border-b border-gray-200" style={{ width: 80 }}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const total = itemTotal(item);
            const isExpanded = expandedIds.has(item.id);
            return (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => toggleExpand(item.id)} className="text-gray-400 hover:text-gray-600" title={isExpanded ? 'Contraer' : 'Expandir'}>
                      {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono text-gray-500">{item.code}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{item.unit}</td>
                  {showMat && <td className="px-3 py-3 text-sm text-right text-gray-700">{item.material > 0 ? formatMoney(item.material) : <span className="text-gray-300">—</span>}</td>}
                  {showMO  && <td className="px-3 py-3 text-sm text-right text-gray-700">{item.manoDeObra > 0 ? formatMoney(item.manoDeObra) : <span className="text-gray-300">—</span>}</td>}
                  {showEq  && <td className="px-3 py-3 text-sm text-right text-gray-700">{item.equipo > 0 ? formatMoney(item.equipo) : <span className="text-gray-300">—</span>}</td>}
                  <td className="px-3 py-3 text-sm text-right font-semibold text-green-700">{formatMoney(total)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => onDelete(item)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={colSpanTotal} className="px-8 py-3">
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="font-semibold text-gray-700 mb-2">Desglose completo:</div>
                        <div className="grid grid-cols-5 gap-4 max-w-xl">
                          <div><span className="text-gray-400">Material</span><div className="font-medium text-gray-800">{formatMoney(item.material)}</div></div>
                          <div><span className="text-gray-400">Mano de Obra</span><div className="font-medium text-gray-800">{formatMoney(item.manoDeObra)}</div></div>
                          <div><span className="text-gray-400">Equipo</span><div className="font-medium text-gray-800">{formatMoney(item.equipo)}</div></div>
                          <div><span className="text-gray-400">Indirectos</span><div className="font-medium text-gray-800">{formatMoney(item.indirectos)}</div></div>
                          <div><span className="text-gray-400">Total</span><div className="font-bold text-green-700">{formatMoney(total)}</div></div>
                        </div>
                        {item.description && <div className="mt-2 text-gray-500"><span className="font-medium">Descripción:</span> {item.description}</div>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
  );
}
