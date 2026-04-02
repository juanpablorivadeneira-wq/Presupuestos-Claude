import { useState, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, FileDown, Filter } from 'lucide-react';
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
  const { addLineItem, updateLineItem, removeLineItem, recalculateBudget } = useStore();

  const budget = budgets.find((b) => b.id === currentBudgetId) ?? null;
  const sourceDb = budget ? databases.find((d) => d.id === budget.databaseId) ?? null : null;

  const [selectedRubroCategoryId, setSelectedRubroCategoryId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editLineItem, setEditLineItem] = useState<BudgetLineItem | null>(null);
  const [search, setSearch] = useState('');
  const [pickSearch, setPickSearch] = useState('');
  const [pickedRubro, setPickedRubro] = useState<Rubro | null>(null);
  const [pickQty, setPickQty] = useState<string>('1');
  const [editQty, setEditQty] = useState<string>('');

  const total = budget ? budget.lineItems.reduce((s, li) => s + li.unitCost * li.quantity, 0) : 0;

  // Rubros available from source db, filtered by category + search
  const availableRubros = useMemo(() => {
    if (!sourceDb) return [];
    let rubros = sourceDb.rubros;
    if (selectedRubroCategoryId) {
      const ids = getCategoryIds(selectedRubroCategoryId, sourceDb.rubroCategories);
      rubros = rubros.filter((r) => r.categoryId !== null && ids.includes(r.categoryId));
    }
    if (pickSearch.trim()) {
      const q = pickSearch.toLowerCase();
      rubros = rubros.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }
    return rubros;
  }, [sourceDb, selectedRubroCategoryId, pickSearch]);

  // Line items filtered by search
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

  function handleAddRubro() {
    if (!pickedRubro || !budget) return;
    const qty = parseFloat(pickQty);
    if (isNaN(qty) || qty <= 0) return;
    addLineItem(budget.id, pickedRubro.id, qty);
    setPickedRubro(null);
    setPickQty('1');
    setPickSearch('');
    setAddModal(false);
  }

  function handleUpdateQty() {
    if (!editLineItem || !budget) return;
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) return;
    updateLineItem(budget.id, editLineItem.id, qty);
    setEditLineItem(null);
  }

  function openEditQty(li: BudgetLineItem) {
    setEditLineItem(li);
    setEditQty(String(li.quantity));
  }

  if (!budget) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No hay presupuesto abierto.
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar: category filter */}
      {sourceDb && (
        <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Categorías de Rubros</h2>
            <p className="text-xs text-gray-400 mt-0.5">{sourceDb.name}</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <CategoryTree
              categories={sourceDb.rubroCategories}
              selectedCategoryId={selectedRubroCategoryId}
              onSelectCategory={setSelectedRubroCategoryId}
              onAddCategory={() => {}}
              onUpdateCategory={() => {}}
              onDeleteCategory={() => {}}
              allLabel="Todos los Rubros"
              readOnly
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setPickedRubro(null); setPickSearch(''); setPickQty('1'); setAddModal(true); }}
              disabled={!sourceDb}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              <Plus size={14} />
              Agregar Rubro
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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 w-44"
              />
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
          {filteredLineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 py-16">
              <p>No hay rubros en este presupuesto.</p>
              {sourceDb && (
                <button
                  onClick={() => { setPickedRubro(null); setPickSearch(''); setPickQty('1'); setAddModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                  <Plus size={14} />
                  Agregar Rubro
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Código</th>
                  <th className="px-4 py-3 text-left font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium">Unidad</th>
                  <th className="px-4 py-3 text-right font-medium">Precio Unit.</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLineItems.map((li) => (
                  <tr key={li.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{li.rubroCode}</td>
                    <td className="px-4 py-3 text-gray-800">{li.rubroName}</td>
                    <td className="px-4 py-3 text-gray-500">{li.rubroUnit}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatMoney(li.unitCost)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditQty(li)}
                        className="text-gray-700 hover:text-green-600 hover:underline font-medium"
                        title="Editar cantidad"
                      >
                        {li.quantity}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                      {formatMoney(li.unitCost * li.quantity)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeLineItem(budget.id, li.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-right text-gray-700">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 text-base">
                    {formatMoney(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Add Rubro Modal */}
      {addModal && sourceDb && (
        <Modal title="Agregar Rubro al Presupuesto" onClose={() => setAddModal(false)} size="xl">
          <div className="flex gap-4 h-[60vh]">
            {/* Category sidebar */}
            <div className="w-48 shrink-0 border-r border-gray-200 overflow-y-auto">
              <CategoryTree
                categories={sourceDb.rubroCategories}
                selectedCategoryId={selectedRubroCategoryId}
                onSelectCategory={setSelectedRubroCategoryId}
                onAddCategory={() => {}}
                onUpdateCategory={() => {}}
                onDeleteCategory={() => {}}
                allLabel="Todos"
                readOnly
              />
            </div>
            {/* Rubro list */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-2">
                <div className="relative">
                  <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={pickSearch}
                    onChange={(e) => setPickSearch(e.target.value)}
                    placeholder="Buscar rubros..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
                {availableRubros.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">Sin resultados</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Código</th>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium">Unidad</th>
                        <th className="px-3 py-2 text-right font-medium">Precio Unit.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availableRubros.map((r) => {
                        const unitCost = rubroTotal(r, sourceDb.items);
                        const selected = pickedRubro?.id === r.id;
                        return (
                          <tr
                            key={r.id}
                            onClick={() => setPickedRubro(selected ? null : r)}
                            className={`cursor-pointer hover:bg-green-50 transition-colors ${
                              selected ? 'bg-green-100 ring-1 ring-inset ring-green-400' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{r.code}</td>
                            <td className="px-3 py-2 text-gray-800">{r.name}</td>
                            <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-700">{formatMoney(unitCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Quantity + confirm */}
              {pickedRubro && (
                <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200 flex items-center gap-3">
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-green-800">{pickedRubro.name}</span>
                    <span className="text-green-600 ml-2 text-xs">({pickedRubro.code})</span>
                  </div>
                  <label className="text-xs text-gray-600 font-medium">Cantidad:</label>
                  <input
                    type="number"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    min="0.001"
                    step="any"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <button
                    onClick={handleAddRubro}
                    className="px-4 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Agregar
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Quantity Modal */}
      {editLineItem && (
        <Modal title="Editar Cantidad" onClose={() => setEditLineItem(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{editLineItem.rubroName}</strong> ({editLineItem.rubroUnit})
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                min="0.001"
                step="any"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditLineItem(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateQty}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
