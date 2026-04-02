import { useState, useMemo } from 'react';
import { Plus, Settings2, Filter } from 'lucide-react';
import { Rubro, SortConfig } from '../../types';
import { useStore, getCategoryIds, rubroTotal } from '../../store/useStore';
import CategoryTree from '../shared/CategoryTree';
import RubroTable from './RubroTable';
import RubroForm from './RubroForm';
import Modal from '../shared/Modal';
import Pagination from '../shared/Pagination';

export default function RubrosView() {
  const {
    rubros,
    rubroCategories,
    items,
    itemCategories,
    addRubro,
    updateRubro,
    deleteRubro,
    addRubroCategory,
    updateRubroCategory,
    deleteRubroCategory,
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedRubro, setSelectedRubro] = useState<Rubro | null>(null);

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
  const categoryFilteredRubros = useMemo(() => {
    if (!selectedCategoryId) return rubros;
    const catIds = getCategoryIds(selectedCategoryId, rubroCategories);
    return rubros.filter((r) => r.categoryId !== null && catIds.includes(r.categoryId));
  }, [rubros, selectedCategoryId, rubroCategories]);

  // Filter by search
  const searchFilteredRubros = useMemo(() => {
    if (!search.trim()) return categoryFilteredRubros;
    const q = search.toLowerCase();
    return categoryFilteredRubros.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [categoryFilteredRubros, search]);

  // Sort
  const sortedRubros = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return searchFilteredRubros;
    return [...searchFilteredRubros].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortConfig.key === 'total') {
        aVal = rubroTotal(a, items);
        bVal = rubroTotal(b, items);
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
  }, [searchFilteredRubros, sortConfig, items]);

  // Paginate
  const totalRubros = sortedRubros.length;
  const paginatedRubros = sortedRubros.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() {
    setSelectedRubro(null);
    setModalMode('create');
  }

  function openEdit(rubro: Rubro) {
    setSelectedRubro(rubro);
    setModalMode('edit');
  }

  function openDelete(rubro: Rubro) {
    setSelectedRubro(rubro);
    setModalMode('delete');
  }

  function handleSave(rubro: Rubro) {
    if (modalMode === 'create') {
      addRubro(rubro);
    } else if (modalMode === 'edit') {
      updateRubro(rubro);
    }
    setModalMode(null);
    setSelectedRubro(null);
  }

  function handleConfirmDelete() {
    if (selectedRubro) {
      deleteRubro(selectedRubro.id);
    }
    setModalMode(null);
    setSelectedRubro(null);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar - category tree */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Categorías de Rubros</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategoryTree
            categories={rubroCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => {
              setSelectedCategoryId(id);
              setPage(1);
            }}
            onAddCategory={addRubroCategory}
            onUpdateCategory={updateRubroCategory}
            onDeleteCategory={deleteRubroCategory}
            allLabel="Todos los Rubros"
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
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              Nuevo Rubro
            </button>

            <div className="relative">
              <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar rubros..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {selectedCategoryId
                ? `Filtrado (${totalRubros})`
                : `Todos los Rubros (${totalRubros})`}
            </span>
            <button className="p-2 rounded-md hover:bg-gray-100 text-gray-400" title="Configuración">
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
          <RubroTable
            rubros={paginatedRubros}
            items={items}
            rubroCategories={rubroCategories}
            onEdit={openEdit}
            onDelete={openDelete}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>

        {/* Pagination */}
        <div className="bg-white border-t border-gray-200">
          <Pagination
            total={totalRubros}
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
          title={modalMode === 'create' ? 'Nuevo Rubro' : 'Editar Rubro'}
          onClose={() => setModalMode(null)}
          size="xl"
        >
          <RubroForm
            rubro={selectedRubro ?? undefined}
            rubros={rubros}
            rubroCategories={rubroCategories}
            items={items}
            itemCategories={itemCategories}
            onSave={handleSave}
            onCancel={() => setModalMode(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedRubro && (
        <Modal title="Eliminar Rubro" onClose={() => setModalMode(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar el rubro{' '}
              <strong className="text-gray-900">{selectedRubro.name}</strong>?
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
