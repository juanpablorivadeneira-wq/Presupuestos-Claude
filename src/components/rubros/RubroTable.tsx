import React, { useState } from 'react';
import { ArrowUpDown, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
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
}

function ColumnHeader({ label, colKey, sortConfig, onSort, className = '' }: ColumnHeaderProps) {
  const isActive = sortConfig.key === colKey;
  return (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${className}`}
      onClick={() => onSort(colKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={12}
          className={isActive && sortConfig.direction ? 'text-green-600' : 'text-gray-300'}
        />
      </div>
    </th>
  );
}

const TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  manoDeObra: 'Mano de Obra',
  equipo: 'Equipo',
  subcontrato: 'Subcontrato',
};

const TYPE_COLORS: Record<string, string> = {
  material: 'bg-blue-50 text-blue-700',
  manoDeObra: 'bg-orange-50 text-orange-700',
  equipo: 'bg-purple-50 text-purple-700',
  subcontrato: 'bg-yellow-50 text-yellow-700',
};

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
      <table className="w-full min-w-[700px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-8 px-2"></th>
            <ColumnHeader label="Código" colKey="code" sortConfig={sortConfig} onSort={onSort} className="w-28" />
            <ColumnHeader label="Nombre" colKey="name" sortConfig={sortConfig} onSort={onSort} />
            <ColumnHeader label="Unidad" colKey="unit" sortConfig={sortConfig} onSort={onSort} className="w-20" />
            <ColumnHeader label="Costo Total" colKey="total" sortConfig={sortConfig} onSort={onSort} className="w-28 text-right" />
            <th className="w-20 px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rubros.map((rubro) => {
            const total = rubroTotal(rubro, items);
            const isExpanded = expandedIds.has(rubro.id);

            return (
              <React.Fragment key={rubro.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  {/* Expand toggle */}
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => toggleExpand(rubro.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </td>
                  {/* Code */}
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {rubro.code}
                    </span>
                  </td>
                  {/* Name + description */}
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900">{rubro.name}</div>
                    {rubro.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{rubro.description}</div>
                    )}
                    {rubro.categoryId && (
                      <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mt-0.5">
                        {rubroCategories.find((c) => c.id === rubro.categoryId)?.name}
                      </span>
                    )}
                  </td>
                  {/* Unit */}
                  <td className="px-3 py-3 text-sm text-gray-600">{rubro.unit}</td>
                  {/* Total */}
                  <td className="px-3 py-3 text-sm text-right font-semibold text-green-600">
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
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded components */}
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-8 py-3">
                      {rubro.components.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin componentes</p>
                      ) : (
                        <table className="w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                          <thead>
                            <tr className="bg-gray-100 text-xs text-gray-500 uppercase">
                              <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                              <th className="px-3 py-2 text-left font-semibold">Código</th>
                              <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                              <th className="px-3 py-2 text-left font-semibold">Unidad</th>
                              <th className="px-3 py-2 text-right font-semibold">Precio Unit.</th>
                              <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                              <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {rubro.components.map((comp) => {
                              const item = items.find((i) => i.id === comp.itemId);
                              if (!item) {
                                return (
                                  <tr key={comp.id} className="text-red-400 text-xs">
                                    <td colSpan={7} className="px-3 py-2">
                                      Item no encontrado (ID: {comp.itemId})
                                    </td>
                                  </tr>
                                );
                              }
                              const unitPrice = itemTotal(item);
                              const subtotal = unitPrice * comp.quantity;
                              return (
                                <tr key={comp.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[comp.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                      {TYPE_LABELS[comp.type] ?? comp.type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                      {item.code}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-800">{item.name}</td>
                                  <td className="px-3 py-2 text-gray-500">{item.unit}</td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {formatMoney(unitPrice)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700">
                                    {comp.quantity}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-green-600">
                                    {formatMoney(subtotal)}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Total row */}
                            <tr className="bg-green-50 font-semibold">
                              <td colSpan={6} className="px-3 py-2 text-right text-sm text-green-800">
                                Costo Total:
                              </td>
                              <td className="px-3 py-2 text-right text-green-700">
                                {formatMoney(total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
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
