import { useState, useMemo, useRef } from 'react';
import { Plus, Search, X, Settings2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Item, SortConfig } from '../../types';
import { useStore, getCategoryIds, itemTotal } from '../../store/useStore';
import CategoryTree from '../shared/CategoryTree';
import ItemTable from './ItemTable';
import ItemForm from './ItemForm';
import ItemsIvaView from './ItemsIvaView';
import Modal from '../shared/Modal';
import Pagination from '../shared/Pagination';

interface ItemsViewProps {
  activeTab: 'items' | 'rubros';
  onTabChange: (tab: 'items' | 'rubros') => void;
}

export default function ItemsView({ onTabChange }: ItemsViewProps) {
  const currentDb = useStore((state) =>
    state.databases.find((d) => d.id === state.currentDatabaseId) ?? null
  );
  const items = currentDb?.items ?? [];
  const itemCategories = currentDb?.itemCategories ?? [];
  const ivaRates = useStore((s) => s.ivaRates);
  const { addItem, updateItem, deleteItem, addItemCategory, updateItemCategory, deleteItemCategory, setIvaRates } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showIvaPanel, setShowIvaPanel] = useState(false);
  const [ivaModalOpen, setIvaModalOpen] = useState(false);
  const [newRateText, setNewRateText] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  function handleSort(key: string) {
    setSortConfig((prev) => {
      if (prev.key === key) {
        const next = prev.direction === null ? 'asc' : prev.direction === 'asc' ? 'desc' : null;
        return { key, direction: next };
      }
      return { key, direction: 'asc' };
    });
    setPage(1);
  }

  const categoryFilteredItems = useMemo(() => {
    if (!selectedCategoryId) return items;
    const catIds = getCategoryIds(selectedCategoryId, itemCategories);
    return items.filter((i) => i.categoryId !== null && catIds.includes(i.categoryId));
  }, [items, selectedCategoryId, itemCategories]);

  const searchFilteredItems = useMemo(() => {
    if (!search.trim()) return categoryFilteredItems;
    const q = search.toLowerCase();
    return categoryFilteredItems.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );
  }, [categoryFilteredItems, search]);

  const sortedItems = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return searchFilteredItems;
    return [...searchFilteredItems].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortConfig.key === 'total') {
        aVal = itemTotal(a); bVal = itemTotal(b);
      } else {
        aVal = (a as unknown as Record<string, string | number>)[sortConfig.key] ?? '';
        bVal = (b as unknown as Record<string, string | number>)[sortConfig.key] ?? '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
        : String(bVal).toLowerCase().localeCompare(String(aVal).toLowerCase());
    });
  }, [searchFilteredItems, sortConfig]);

  const totalItems = sortedItems.length;
  const paginatedItems = pageSize === 0 ? sortedItems : sortedItems.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() { setSelectedItem(null); setModalMode('create'); }
  function openEdit(item: Item) { setSelectedItem(item); setModalMode('edit'); }
  function openDelete(item: Item) { setSelectedItem(item); setModalMode('delete'); }

  function handleSave(item: Item) {
    if (modalMode === 'create') addItem(item);
    else if (modalMode === 'edit') updateItem(item);
    setModalMode(null);
    setSelectedItem(null);
  }

  function handleConfirmDelete() {
    if (selectedItem) deleteItem(selectedItem.id);
    setModalMode(null);
    setSelectedItem(null);
  }

  function addIvaRate() {
    const val = parseFloat(newRateText.replace(',', '.').replace('%', '').trim());
    if (isNaN(val) || val < 0 || val > 100) return;
    const rate = val > 1 ? val / 100 : val;
    if (!ivaRates.includes(rate)) setIvaRates([...ivaRates, rate]);
    setNewRateText('');
  }

  function removeIvaRate(rate: number) {
    setIvaRates(ivaRates.filter((r) => r !== rate));
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-200 shrink-0">
          <button className="flex-1 py-2.5 text-sm font-semibold text-gray-900 bg-white border-b-2 border-gray-800 transition-colors">
            Items
          </button>
          <button
            onClick={() => onTabChange('rubros')}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 border-b-2 border-transparent transition-colors"
          >
            APU - Rubro
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategoryTree
            categories={itemCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => { setSelectedCategoryId(id); setPage(1); }}
            onAddCategory={addItemCategory}
            onUpdateCategory={updateItemCategory}
            onDeleteCategory={deleteItemCategory}
            allLabel="Todos los Items"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo Item
          </button>

          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar ítem..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            {search && (
              <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <span className="text-sm text-gray-400 shrink-0">{totalItems} registros</span>

          <div className="ml-auto flex items-center gap-2">
            {/* IVA rates manager */}
            <button
              onClick={() => setIvaModalOpen(true)}
              title="Gestionar tasas IVA"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
            >
              <Settings2 size={13} />
              Tasas IVA
            </button>

            {/* IVA analysis toggle */}
            <button
              onClick={() => setShowIvaPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-colors ${showIvaPanel ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
            >
              {showIvaPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Análisis IVA
            </button>
          </div>
        </div>

        {/* Table area */}
        <div className={`${showIvaPanel ? 'flex-none' : 'flex-1'} overflow-auto bg-white`} style={showIvaPanel ? { maxHeight: '45%' } : {}}>
          <ItemTable
            items={paginatedItems}
            categories={itemCategories}
            selectedCategoryId={selectedCategoryId}
            onEdit={openEdit}
            onDelete={openDelete}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>

        {/* Pagination */}
        {!showIvaPanel && (
          <div className="bg-white border-t border-gray-200 shrink-0">
            <Pagination
              total={totalItems}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          </div>
        )}

        {/* IVA analysis panel */}
        {showIvaPanel && (
          <div className="flex-1 overflow-hidden border-t-2 border-amber-400">
            <ItemsIvaView items={items} />
          </div>
        )}
      </div>

      {/* IVA rates manager modal */}
      {ivaModalOpen && (
        <Modal title="Tasas IVA disponibles" onClose={() => setIvaModalOpen(false)} size="sm">
          <div className="space-y-4">
            <p className="text-xs text-gray-500">Estas son las tasas que aparecen al crear o editar un ítem.</p>

            <div className="space-y-1">
              {ivaRates.map((rate) => (
                <div key={rate} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-800">
                    {(rate * 100).toFixed(0)}%
                    {rate === 0 && <span className="ml-2 text-xs text-gray-400">Exento / Tarifa 0</span>}
                    {rate === 0.15 && <span className="ml-2 text-xs text-amber-600">Ecuador estándar</span>}
                  </span>
                  <button
                    onClick={() => removeIvaRate(rate)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Eliminar tasa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1 border-t border-gray-200">
              <input
                type="text"
                value={newRateText}
                onChange={(e) => setNewRateText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIvaRate()}
                placeholder="Ej: 15 o 0.15"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                onClick={addIvaRate}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"
              >
                Agregar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create/Edit Item modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal title="Detalles del Item" onClose={() => setModalMode(null)} size="lg">
          <ItemForm
            item={selectedItem ?? undefined}
            categories={itemCategories}
            onSave={handleSave}
            onCancel={() => setModalMode(null)}
          />
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {modalMode === 'delete' && selectedItem && (
        <Modal title="Eliminar Item" onClose={() => setModalMode(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar el item{' '}
              <strong className="text-gray-900">{selectedItem.name}</strong>?
            </p>
            <p className="text-xs text-amber-600">
              Nota: Si este item está siendo usado en algún Rubro, los componentes relacionados quedarán sin referencia.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
