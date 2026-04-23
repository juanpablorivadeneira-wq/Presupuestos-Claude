import { useState, useMemo, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Item, SortConfig } from '../../types';
import { useStore, getCategoryIds, itemTotal } from '../../store/useStore';
import CategoryTree from '../shared/CategoryTree';
import ItemTable from './ItemTable';
import ItemForm from './ItemForm';
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
  const {
    addItem,
    updateItem,
    deleteItem,
    addItemCategory,
    updateItemCategory,
    deleteItemCategory,
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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

  // Filter by category
  const categoryFilteredItems = useMemo(() => {
    if (!selectedCategoryId) return items;
    const catIds = getCategoryIds(selectedCategoryId, itemCategories);
    return items.filter((i) => i.categoryId !== null && catIds.includes(i.categoryId));
  }, [items, selectedCategoryId, itemCategories]);

  // Filter by search
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

  // Sort
  const sortedItems = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return searchFilteredItems;
    return [...searchFilteredItems].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortConfig.key === 'total') {
        aVal = itemTotal(a);
        bVal = itemTotal(b);
      } else {
        aVal = (a as unknown as Record<string, string | number>)[sortConfig.key] ?? '';
        bVal = (b as unknown as Record<string, string | number>)[sortConfig.key] ?? '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [searchFilteredItems, sortConfig]);

  // Paginate
  const totalItems = sortedItems.length;
  const paginatedItems = pageSize === 0 ? sortedItems : sortedItems.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() {
    setSelectedItem(null);
    setModalMode('create');
  }

  function openEdit(item: Item) {
    setSelectedItem(item);
    setModalMode('edit');
  }

  function openDelete(item: Item) {
    setSelectedItem(item);
    setModalMode('delete');
  }

  function handleSave(item: Item) {
    if (modalMode === 'create') {
      addItem(item);
    } else if (modalMode === 'edit') {
      updateItem(item);
    }
    setModalMode(null);
    setSelectedItem(null);
  }

  function handleConfirmDelete() {
    if (selectedItem) {
      deleteItem(selectedItem.id);
    }
    setModalMode(null);
    setSelectedItem(null);
  }

  function handleCategoryChange() {
    setPage(1);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Items / Assemblies tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            className="flex-1 py-2.5 text-sm font-semibold text-gray-900 bg-white border-b-2 border-gray-800 transition-colors"
          >
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
            onSelectCategory={(id) => {
              setSelectedCategoryId(id);
              setPage(1);
              handleCategoryChange();
            }}
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
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuevo Item
          </button>

          {/* Search */}
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
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span className="text-sm text-gray-400 shrink-0">{totalItems} registros</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
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
        <div className="bg-white border-t border-gray-200">
          <Pagination
            total={totalItems}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal
          title="Detalles del Item"
          onClose={() => setModalMode(null)}
          size="lg"
        >
          <ItemForm
            item={selectedItem ?? undefined}
            categories={itemCategories}
            onSave={handleSave}
            onCancel={() => setModalMode(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
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
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
