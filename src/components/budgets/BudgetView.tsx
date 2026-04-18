import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, RefreshCw, FileDown, Search, X, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react';
import { useStore, formatMoney, rubroTotal, getCategoryIds } from '../../store/useStore';
import { AppView, BudgetLineItem, Rubro } from '../../types';
import Modal from '../shared/Modal';
import CategoryTree from '../shared/CategoryTree';
import { exportBudgetPdf } from '../../utils/exportPdf';
import { exportBudgetExcel } from '../../utils/exportExcel';

interface BudgetViewProps {
  onNavigate: (view: AppView) => void;
}

export default function BudgetView({ onNavigate: _onNavigate }: BudgetViewProps) {
  const budgets = useStore((s) => s.budgets);
  const currentBudgetId = useStore((s) => s.currentBudgetId);
  const databases = useStore((s) => s.databases);
  const { addLineItemsBulk, removeLineItem, updateLineItem, recalculateBudget } = useStore();

  const budget = budgets.find((b) => b.id === currentBudgetId) ?? null;
  const sourceDb = budget ? databases.find((d) => d.id === budget.databaseId) ?? null : null;
  const ivaRate = budget?.ivaRate ?? 0.12;

  // ── Search ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Inline quantity edit ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState('');

  // ── Collapsed chapters ──────────────────────────────────────────────────────
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  // ── Add modal state ─────────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(false);
  const [pickCategoryId, setPickCategoryId] = useState<string | null>(null);
  const [pickSearch, setPickSearch] = useState('');
  const [selectedRubros, setSelectedRubros] = useState<Map<string, number>>(new Map());

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = budget ? budget.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0) : 0;
  const subtotalMat = budget ? budget.lineItems.reduce((s, li) => s + (li.materialCost ?? 0) * li.quantity, 0) : 0;
  const subtotalMO = budget ? budget.lineItems.reduce((s, li) => s + (li.manoDeObraCost ?? 0) * li.quantity, 0) : 0;
  const subtotalEq = budget ? budget.lineItems.reduce((s, li) => s + (li.equipoCost ?? 0) * li.quantity, 0) : 0;
  const ivaAmount = subtotal * ivaRate;
  const total = subtotal + ivaAmount;

  // ── Filtered + grouped line items ───────────────────────────────────────────
  const filteredLineItems = useMemo(() => {
    if (!budget) return [];
    if (!search.trim()) return budget.lineItems;
    const q = search.toLowerCase();
    return budget.lineItems.filter(
      (li) =>
        li.rubroCode.toLowerCase().includes(q) ||
        li.rubroName.toLowerCase().includes(q)
    );
  }, [budget, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { categoryName: string; items: BudgetLineItem[] }>();
    for (const li of filteredLineItems) {
      const key = li.categoryId ?? '__none__';
      if (!map.has(key)) {
        map.set(key, { categoryName: li.categoryName || 'Sin Categoría', items: [] });
      }
      map.get(key)!.items.push(li);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      a.categoryName.localeCompare(b.categoryName)
    );
  }, [filteredLineItems]);

  // ── Available rubros for add modal ──────────────────────────────────────────
  const availableRubros = useMemo(() => {
    if (!sourceDb) return [];
    let rubros = sourceDb.rubros;
    if (pickCategoryId) {
      const ids = getCategoryIds(pickCategoryId, sourceDb.rubroCategories);
      rubros = rubros.filter((r) => r.categoryId !== null && ids.includes(r.categoryId));
    }
    if (pickSearch.trim()) {
      const q = pickSearch.toLowerCase();
      rubros = rubros.filter(
        (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
      );
    }
    return rubros;
  }, [sourceDb, pickCategoryId, pickSearch]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function startEdit(li: BudgetLineItem) {
    setEditingId(li.id);
    setEditingQty(String(li.quantity));
  }

  function commitEdit() {
    if (!editingId || !budget) { setEditingId(null); return; }
    const qty = parseFloat(editingQty);
    if (!isNaN(qty) && qty > 0) {
      updateLineItem(budget.id, editingId, qty);
    }
    setEditingId(null);
  }

  function toggleRubroSelect(rubro: Rubro) {
    setSelectedRubros((prev) => {
      const next = new Map(prev);
      if (next.has(rubro.id)) next.delete(rubro.id);
      else next.set(rubro.id, 1);
      return next;
    });
  }

  function updatePickQty(rubroId: string, val: string) {
    const qty = parseFloat(val) || 0;
    setSelectedRubros((prev) => {
      const next = new Map(prev);
      next.set(rubroId, qty);
      return next;
    });
  }

  function handleAddSelected() {
    if (!budget) return;
    const items = Array.from(selectedRubros.entries())
      .filter(([, qty]) => qty > 0)
      .map(([rubroId, quantity]) => ({ rubroId, quantity }));
    if (items.length > 0) addLineItemsBulk(budget.id, items);
    setSelectedRubros(new Map());
    setPickSearch('');
    setAddModal(false);
  }

  function toggleChapter(key: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedRubros((prev) => {
      const next = new Map(prev);
      for (const r of availableRubros) {
        if (!next.has(r.id)) next.set(r.id, 1);
      }
      return next;
    });
  }

  function deselectAllVisible() {
    setSelectedRubros((prev) => {
      const next = new Map(prev);
      for (const r of availableRubros) next.delete(r.id);
      return next;
    });
  }

  const allVisibleSelected = availableRubros.length > 0 && availableRubros.every((r) => selectedRubros.has(r.id));

  function openAddModal() {
    setSelectedRubros(new Map());
    setPickSearch('');
    setPickCategoryId(null);
    setAddModal(true);
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{budget.name}</h2>
            {budget.description && (
              <p className="text-xs text-gray-500 mt-0.5">{budget.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Base de datos: <span className="text-gray-600">{budget.databaseName}</span>
              {' · '}
              Creado: {new Date(budget.createdAt).toLocaleDateString('es-EC')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold text-green-600">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            disabled={!sourceDb}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            <Plus size={14} />
            Agregar Rubros
          </button>
          <button
            onClick={() => recalculateBudget(budget.id)}
            disabled={!sourceDb}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Recalcular Precios
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar rubro..."
              className="pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 w-48"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => exportBudgetPdf(budget)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <FileDown size={14} />
            PDF
          </button>
          <button
            onClick={() => exportBudgetExcel(budget)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <FileDown size={14} />
            Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {budget.lineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-3 py-16">
            <p>No hay rubros en este presupuesto.</p>
            {sourceDb && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700"
              >
                <Plus size={14} />
                Agregar Rubros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-28">Código</th>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium w-16">Unidad</th>
                <th className="px-3 py-3 text-right font-medium w-28 text-blue-600">Material</th>
                <th className="px-3 py-3 text-right font-medium w-28 text-orange-600">Mano Obra</th>
                <th className="px-3 py-3 text-right font-medium w-24 text-purple-600">Equipo</th>
                <th className="px-3 py-3 text-right font-medium w-28">Precio Unit.</th>
                <th className="px-3 py-3 text-right font-medium w-24">Cantidad</th>
                <th className="px-3 py-3 text-right font-medium w-32">Total</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([key, { categoryName, items }]) => {
                const chapterTotal = items.reduce((s, li) => s + li.unitCost * li.quantity, 0);
                const isCollapsed = collapsedChapters.has(key);
                return (
                  <React.Fragment key={key}>
                    {/* Chapter header */}
                    {(() => {
                      const chMat = items.reduce((s, li) => s + (li.materialCost ?? 0) * li.quantity, 0);
                      const chMO  = items.reduce((s, li) => s + (li.manoDeObraCost ?? 0) * li.quantity, 0);
                      const chEq  = items.reduce((s, li) => s + (li.equipoCost ?? 0) * li.quantity, 0);
                      return (
                        <tr
                          className="bg-gray-100 cursor-pointer select-none hover:bg-gray-200 transition-colors"
                          onClick={() => toggleChapter(key)}
                        >
                          <td colSpan={3} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isCollapsed
                                ? <ChevronRight size={14} className="text-gray-500 shrink-0" />
                                : <ChevronDown size={14} className="text-gray-500 shrink-0" />
                              }
                              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                {categoryName}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({items.length} rubro{items.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">{formatMoney(chMat)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-orange-700">{formatMoney(chMO)}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-purple-700">{formatMoney(chEq)}</td>
                          <td />{/* Precio Unit. */}
                          <td />{/* Cantidad */}
                          <td className="px-3 py-2 text-right text-xs font-bold text-gray-700">{formatMoney(chapterTotal)}</td>
                          <td />
                        </tr>
                      );
                    })()}

                    {/* Line items */}
                    {!isCollapsed && items.map((li) => (
                      <tr key={li.id} className="hover:bg-gray-50 group border-t border-gray-50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{li.rubroCode}</td>
                        <td className="px-4 py-2.5 text-gray-800">{li.rubroName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{li.rubroUnit}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-blue-700">{(li.materialCost ?? 0) > 0 ? formatMoney(li.materialCost) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-orange-700">{(li.manoDeObraCost ?? 0) > 0 ? formatMoney(li.manoDeObraCost) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-sm text-purple-700">{(li.equipoCost ?? 0) > 0 ? formatMoney(li.equipoCost) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatMoney(li.unitCost)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {editingId === li.id ? (
                            <input
                              type="number"
                              value={editingQty}
                              onChange={(e) => setEditingQty(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="w-24 px-2 py-0.5 text-sm text-right border border-green-400 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              autoFocus
                              min="0.001"
                              step="any"
                            />
                          ) : (
                            <button
                              onClick={() => startEdit(li)}
                              className="text-gray-700 hover:text-green-600 hover:underline font-medium tabular-nums"
                              title="Click para editar cantidad"
                            >
                              {li.quantity % 1 === 0 ? li.quantity.toString() : li.quantity.toFixed(2)}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                          {formatMoney(li.unitCost * li.quantity)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => removeLineItem(budget.id, li.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-4 py-2.5 text-right text-sm text-gray-600 font-medium">Subtotal</td>
                <td className="px-3 py-2.5 text-right text-sm text-blue-700 font-semibold">{formatMoney(subtotalMat)}</td>
                <td className="px-3 py-2.5 text-right text-sm text-orange-700 font-semibold">{formatMoney(subtotalMO)}</td>
                <td className="px-3 py-2.5 text-right text-sm text-purple-700 font-semibold">{formatMoney(subtotalEq)}</td>
                <td />{/* Precio Unit. */}
                <td />{/* Cantidad */}
                <td className="px-3 py-2.5 text-right text-sm text-gray-800 font-semibold">{formatMoney(subtotal)}</td>
                <td />
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-4 py-2 text-right text-sm text-gray-500">
                  IVA ({(ivaRate * 100).toFixed(0)}%)
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-600">{formatMoney(ivaAmount)}</td>
                <td />
              </tr>
              <tr className="bg-green-50">
                <td colSpan={8} className="px-4 py-3 text-right text-sm font-bold text-gray-800">TOTAL</td>
                <td className="px-3 py-3 text-right text-base font-bold text-green-700">{formatMoney(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Add Rubros Modal ─────────────────────────────────────────────────── */}
      {addModal && sourceDb && (
        <Modal title="Agregar Rubros al Presupuesto" onClose={() => setAddModal(false)} size="xl">
          <div className="flex h-[65vh]">
            {/* Chapter sidebar */}
            <div className="w-52 shrink-0 border-r border-gray-200 overflow-y-auto">
              <CategoryTree
                categories={sourceDb.rubroCategories}
                selectedCategoryId={pickCategoryId}
                onSelectCategory={setPickCategoryId}
                onAddCategory={() => {}}
                onUpdateCategory={() => {}}
                onDeleteCategory={() => {}}
                allLabel="Todos los Capítulos"
                readOnly
              />
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search + select all */}
              <div className="p-3 border-b border-gray-100 shrink-0 flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={pickSearch}
                    onChange={(e) => setPickSearch(e.target.value)}
                    placeholder="Buscar rubros..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                {availableRubros.length > 0 && (
                  <button
                    onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-colors shrink-0 font-medium ${
                      allVisibleSelected
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title={allVisibleSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  >
                    <CheckSquare size={13} />
                    {allVisibleSelected ? 'Deseleccionar' : `Seleccionar todo (${availableRubros.length})`}
                  </button>
                )}
              </div>

              {/* Rubro list */}
              <div className="flex-1 overflow-y-auto">
                {availableRubros.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Sin resultados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="w-9 px-2 py-2"></th>
                        <th className="px-3 py-2 text-left font-medium w-28">Código</th>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium w-20">Unidad</th>
                        <th className="px-3 py-2 text-right font-medium w-28">Precio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availableRubros.map((r) => {
                        const unitCost = rubroTotal(r, sourceDb.items);
                        const isSelected = selectedRubros.has(r.id);
                        return (
                          <tr
                            key={r.id}
                            onClick={() => toggleRubroSelect(r)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-green-50 hover:bg-green-100'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-green-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.code}</td>
                            <td className="px-3 py-2 text-gray-800">{r.name}</td>
                            <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                            <td className="px-3 py-2 text-right text-gray-700 font-medium">
                              {formatMoney(unitCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Selected rubros panel */}
              {selectedRubros.size > 0 && (
                <div className="border-t-2 border-green-200 bg-green-50 shrink-0 max-h-44 overflow-y-auto">
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-xs font-semibold text-green-800">
                      {selectedRubros.size} rubro{selectedRubros.size !== 1 ? 's' : ''} seleccionado{selectedRubros.size !== 1 ? 's' : ''} — ingresa las cantidades:
                    </span>
                  </div>
                  <div className="px-3 pb-2 space-y-1.5">
                    {Array.from(selectedRubros.entries()).map(([rubroId, qty]) => {
                      const rubro = sourceDb.rubros.find((r) => r.id === rubroId);
                      if (!rubro) return null;
                      return (
                        <div key={rubroId} className="flex items-center gap-2">
                          <span className="flex-1 text-xs text-gray-700 truncate">{rubro.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{rubro.unit}</span>
                          <label className="text-xs text-gray-500 shrink-0">Cant.:</label>
                          <input
                            type="number"
                            value={qty || ''}
                            onChange={(e) => updatePickQty(rubroId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            min="0.001"
                            step="any"
                            placeholder="1"
                            className="w-20 px-2 py-0.5 text-xs text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRubroSelect(rubro); }}
                            className="p-0.5 rounded text-gray-400 hover:text-red-500 shrink-0"
                            title="Quitar"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 flex items-center justify-between bg-white shrink-0">
                <span className="text-xs text-gray-500">
                  {selectedRubros.size === 0
                    ? 'Selecciona rubros marcando los checkboxes'
                    : `${selectedRubros.size} rubro${selectedRubros.size !== 1 ? 's' : ''} listo${selectedRubros.size !== 1 ? 's' : ''} para agregar`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddModal(false)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedRubros.size === 0}
                    className="px-4 py-1.5 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    Agregar{selectedRubros.size > 0 ? ` (${selectedRubros.size})` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
