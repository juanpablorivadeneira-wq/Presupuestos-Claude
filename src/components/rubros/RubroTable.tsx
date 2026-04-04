import React, { useState } from 'react';
import { ArrowUpDown, Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { Item, Rubro, RubroCategory, SortConfig } from '../../types';
import { itemTotal, rubroTotal, formatMoney } from '../../store/useStore';

interface RubroTableProps {
  rubros: Rubro[];
  items: Item[];
  rubroCategories: RubroCategory[];
  onEdit: (rubro: Rubro) => void;
  onDelete: (rubro: Rubro) => void;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
}

interface ColumnHeaderProps {
  label: string;
  colKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

function ColumnHeader({ label, colKey, sortConfig, onSort, className = '', align = 'left' }: ColumnHeaderProps) {
  const isActive = sortConfig.key === colKey;
  return (
    <th
      className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      onClick={() => onSort(colKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown
          size={12}
          className={isActive && sortConfig.direction ? 'text-green-600' : 'text-gray-300'}
        />
      </div>
    </th>
  );
}

type ComponentType = 'material' | 'manoDeObra' | 'equipo' | 'subcontrato';

const TYPE_GROUPS: { type: ComponentType; label: string; labelEs: string; headerBg: string; labelColor: string }[] = [
  { type: 'material',    label: 'Material',    labelEs: 'Material',      headerBg: 'bg-blue-50',   labelColor: 'text-blue-700' },
  { type: 'manoDeObra',  label: 'Labor',       labelEs: 'Mano de Obra',  headerBg: 'bg-orange-50', labelColor: 'text-orange-700' },
  { type: 'equipo',      label: 'Equipment',   labelEs: 'Equipo',        headerBg: 'bg-purple-50', labelColor: 'text-purple-700' },
  { type: 'subcontrato', label: 'Subcontract', labelEs: 'Subcontrato',   headerBg: 'bg-yellow-50', labelColor: 'text-yellow-700' },
];

function typeCost(rubro: Rubro, items: Item[], type: ComponentType): number {
  return rubro.components
    .filter((c) => c.type === type)
    .reduce((sum, c) => {
      const item = items.find((i) => i.id === c.itemId);
      return item ? sum + itemTotal(item) * c.quantity : sum;
    }, 0);
}

export default function RubroTable({
  rubros,
  items,
  rubroCategories,
  onEdit,
  onDelete,
  sortConfig,
  onSort,
}: RubroTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rubros.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
        No se encontraron rubros
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <tr>
            <th className="w-8 px-2"></th>
            <ColumnHeader label="Código" colKey="code" sortConfig={sortConfig} onSort={onSort} className="w-28" />
            <ColumnHeader label="Nombre" colKey="name" sortConfig={sortConfig} onSort={onSort} />
            <ColumnHeader label="Unidad" colKey="unit" sortConfig={sortConfig} onSort={onSort} className="w-20" />
            <th className="px-3 py-3 text-right text-xs font-semibold text-blue-500 uppercase tracking-wider w-28">
              Material
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-orange-500 uppercase tracking-wider w-28">
              M. Obra
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-purple-500 uppercase tracking-wider w-28">
              Equipo
            </th>
            <ColumnHeader label="Total" colKey="total" sortConfig={sortConfig} onSort={onSort} className="w-28" align="right" />
            <th className="w-20 px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rubros.map((rubro) => {
            const total = rubroTotal(rubro, items);
            const matCost = typeCost(rubro, items, 'material');
            const labCost = typeCost(rubro, items, 'manoDeObra');
            const eqpCost = typeCost(rubro, items, 'equipo');
            const isExpanded = expandedIds.has(rubro.id);

            return (
              <React.Fragment key={rubro.id}>
                {/* ── Main rubro row ─────────────────────────────────── */}
                <tr className={`transition-colors ${isExpanded ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                  {/* Expand toggle */}
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => toggleExpand(rubro.id)}
                      className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors"
                      title={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      {isExpanded ? <Minus size={10} /> : <Plus size={10} />}
                    </button>
                  </td>

                  {/* Code */}
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono text-gray-500">{rubro.code}</span>
                  </td>

                  {/* Name + description */}
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900">{rubro.name}</div>
                    {rubro.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{rubro.description}</div>
                    )}
                    {rubro.categoryId && (
                      <span className="inline-block text-xs text-gray-400 mt-0.5">
                        {rubroCategories.find((c) => c.id === rubro.categoryId)?.name}
                      </span>
                    )}
                  </td>

                  {/* Unit */}
                  <td className="px-3 py-3 text-sm text-gray-600">{rubro.unit}</td>

                  {/* Material cost */}
                  <td className="px-3 py-3 text-right text-sm text-blue-600">
                    {matCost > 0 ? formatMoney(matCost) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Labor cost */}
                  <td className="px-3 py-3 text-right text-sm text-orange-600">
                    {labCost > 0 ? formatMoney(labCost) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Equipment cost */}
                  <td className="px-3 py-3 text-right text-sm text-purple-600">
                    {eqpCost > 0 ? formatMoney(eqpCost) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Total */}
                  <td className="px-3 py-3 text-right text-sm font-semibold text-green-600">
                    {formatMoney(total)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(rubro)}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(rubro)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ── Expanded detail — grouped by type ──────────────── */}
                {isExpanded && (
                  <tr>
                    <td colSpan={9} className="p-0 bg-blue-50 border-b border-blue-100">
                      {rubro.components.length === 0 ? (
                        <p className="px-10 py-3 text-sm text-gray-400 italic">Sin componentes</p>
                      ) : (
                        <div className="pb-3">
                          {TYPE_GROUPS.map(({ type, label, labelEs }) => {
                            const comps = rubro.components.filter((c) => c.type === type);
                            if (comps.length === 0) return null;

                            return (
                              <div key={type}>
                                {/* Section title — plain text, like reference */}
                                <div className="px-10 pt-2.5 pb-1">
                                  <span className="text-xs text-gray-600">
                                    <span className="font-semibold">{labelEs}</span>
                                    {' '}({comps.length} {comps.length === 1 ? 'quote' : 'quotes'}) - {rubro.code} {rubro.name}
                                    <span className="text-gray-400 ml-1 hidden sm:inline">— {label}</span>
                                  </span>
                                </div>

                                {/* Sub-table */}
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-300 text-gray-700">
                                      <th className="pl-10 pr-3 py-1.5 text-left font-semibold w-[40%]">Name</th>
                                      <th className="px-3 py-1.5 text-right font-semibold w-24">Quantity</th>
                                      <th className="px-3 py-1.5 text-right font-semibold w-24">Cost</th>
                                      <th className="px-3 py-1.5 text-right font-semibold w-28 pr-10">Total Cost</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {comps.map((comp, idx) => {
                                      const item = items.find((i) => i.id === comp.itemId);
                                      if (!item) return (
                                        <tr key={comp.id} className="bg-white">
                                          <td colSpan={4} className="pl-10 pr-3 py-1.5 text-red-400 italic">
                                            Item no encontrado
                                          </td>
                                        </tr>
                                      );
                                      const unitPrice = itemTotal(item);
                                      const subtotal = unitPrice * comp.quantity;
                                      return (
                                        <tr key={comp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                          <td className="pl-10 pr-3 py-1.5 text-gray-800 truncate max-w-0">
                                            <span className="truncate block">{item.name}</span>
                                            <span className="text-gray-400 font-mono text-[10px]">{item.code} · {item.unit}</span>
                                          </td>
                                          <td className="px-3 py-1.5 text-right text-gray-700">{comp.quantity}</td>
                                          <td className="px-3 py-1.5 text-right text-gray-700">{formatMoney(unitPrice)}</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-gray-800 pr-10">{formatMoney(subtotal)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
