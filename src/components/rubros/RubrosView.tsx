import { useState, useMemo } from 'react';
import { Plus, Settings2, Filter } from 'lucide-react';
import { Rubro, SortConfig } from '../../types';
import { useStore, getCategoryIds, rubroTotal, genId } from '../../store/useStore';
import CategoryTree from '../shared/CategoryTree';
import RubroTable from './RubroTable';
import RubroForm from './RubroForm';
import Modal from '../shared/Modal';
import Pagination from '../shared/Pagination';

interface RubrosViewProps {
  activeTab: 'items' | 'rubros';
  onTabChange: (tab: 'items' | 'rubros') => void;
}

export default function RubrosView({ onTabChange }: RubrosViewProps) {
  const currentDb = useStore((state) =>
    state.databases.find((d) => d.id === state.currentDatabaseId) ?? null
  );
  const rubros = currentDb?.rubros ?? [];
  const rubroCategories = currentDb?.rubroCategories ?? [];
  const items = currentDb?.items ?? [];
  const itemCategories = currentDb?.itemCategories ?? [];
  const {
    addRubro,
    updateRubro,
    deleteRubro,
    addRubroCategory,
    updateRubroCategory,
    deleteRubroCategory,
  } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, _setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | 'duplicate' | null>(null);
  const [selectedRubro, setSelectedRubro] = useState<Rubro | null>(null);

  // Duplicate form state
  const [dupCode, setDupCode] = useState('');
  const [dupName, setDupName] = useState('');
  const [dupErrors, setDupErrors] = useState<{ code?: string; name?: string }>({});

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

  const categoryFilteredRubros = useMemo(() => {
    if (!selectedCategoryId) return rubros;
    const catIds = getCategoryIds(selectedCategoryId, rubroCategories);
    return rubros.filter((r) => r.categoryId !== null && catIds.includes(r.categoryId));
  }, [rubros, selectedCategoryId, rubroCategories]);

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

  const totalRubros = sortedRubros.length;
  const paginatedRubros = pageSize === 0 ? sortedRubros : sortedRubros.slice((page - 1) * pageSize, page * pageSize);

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

  function openDuplicate(rubro: Rubro) {
    setSelectedRubro(rubro);
    setDupCode(rubro.code + '-COPIA');
    setDupName(rubro.name + ' (copia)');
    setDupErrors({});
    setModalMode('duplicate');
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
    if (selectedRubro) deleteRubro(selectedRubro.id);
    setModalMode(null);
    setSelectedRubro(null);
  }

  function handleConfirmDuplicate() {
    if (!selectedRubro) return;
    const errs: { code?: string; name?: string } = {};
    const codeExists = rubros.some((r) => r.code.trim().toLowerCase() === dupCode.trim().toLowerCase());
    const nameExists = rubros.some((r) => r.name.trim().toLowerCase() === dupName.trim().toLowerCase());
    if (!dupCode.trim()) errs.code = 'Requerido';
    else if (codeExists) errs.code = 'Ya existe un APU con este código';
    if (!dupName.trim()) errs.name = 'Requerido';
    else if (nameExists) errs.name = 'Ya existe un APU con este nombre';
    if (Object.keys(errs).length > 0) { setDupErrors(errs); return; }

    addRubro({
      ...selectedRubro,
      id: genId(),
      code: dupCode.trim(),
      name: dupName.trim(),
      components: selectedRubro.components.map((c) => ({ ...c, id: genId() })),
    });
    setModalMode(null);
    setSelectedRubro(null);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-200 shrink-0">
          <button
            onClick={() => onTabChange('items')}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700 border-b-2 border-transparent transition-colors"
          >
            Items
          </button>
          <button
            className="flex-1 py-2.5 text-sm font-semibold text-gray-900 bg-white border-b-2 border-gray-800 transition-colors"
          >
            APU - Rubro
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategoryTree
            categories={rubroCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => { setSelectedCategoryId(id); setPage(1); }}
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
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
              Nuevo Rubro
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">
              {selectedCategoryId ? `Filtrado (${totalRubros})` : `Todos los Rubros (${totalRubros})`}
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
            onDuplicate={openDuplicate}
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
          title={modalMode === 'create' ? 'Nuevo Rubro' : 'Detalles del Rubro'}
          onClose={() => setModalMode(null)}
          size="xl"
          flush
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

      {/* Delete Modal */}
      {modalMode === 'delete' && selectedRubro && (
        <Modal title="Eliminar Rubro" onClose={() => setModalMode(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar el rubro{' '}
              <strong className="text-gray-900">{selectedRubro.name}</strong>?
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

      {/* Duplicate Modal */}
      {modalMode === 'duplicate' && selectedRubro && (
        <Modal title="Duplicar Rubro" onClose={() => setModalMode(null)} size="sm">
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Se creará una copia de <strong className="text-gray-700">{selectedRubro.name}</strong> con todos sus componentes.
              Asigna un nuevo código y nombre.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={dupCode}
                onChange={(e) => { setDupCode(e.target.value); setDupErrors((p) => ({ ...p, code: '' })); }}
                autoFocus
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${dupErrors.code ? 'border-red-400' : 'border-gray-300'}`}
              />
              {dupErrors.code && <p className="text-red-500 text-xs mt-0.5">{dupErrors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={dupName}
                onChange={(e) => { setDupName(e.target.value); setDupErrors((p) => ({ ...p, name: '' })); }}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${dupErrors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {dupErrors.name && <p className="text-red-500 text-xs mt-0.5">{dupErrors.name}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModalMode(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleConfirmDuplicate} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">
                Duplicar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
