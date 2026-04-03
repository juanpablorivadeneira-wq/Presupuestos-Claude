import { useState, useMemo } from 'react';
import { Plus, Settings2, Filter } from 'lucide-react';
import { Item, SortConfig } from '../../types';
import { useStore, getCategoryIds, itemTotal } from '../../store/useStore';
import CategoryTree from '../shared/CategoryTree';
import ItemTable from './ItemTable';
import ItemForm from './ItemForm';
import Modal from '../shared/Modal';
import Pagination from '../shared/Pagination';

export default function ItemsView() {
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
  const [search, _setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

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
      {/* Left sidebar - category tree */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
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
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
              Nuevo Item
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {selectedCategoryId
                ? `Filtrado (${totalItems})`
                : `Todos los Items (${totalItems})`}
            </span>
            <button className="p-2 rounded-md hover:bg-gray-100 text-gray-400" title="Configuración">
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
          <ItemTable
            items={paginatedItems}
            categories={itemCategories}
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
