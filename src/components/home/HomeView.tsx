import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  FolderOpen,
  BarChart2,
  Database,
  FileText,
} from 'lucide-react';
import { useStore, formatMoney } from '../../store/useStore';
import { AppView, Budget } from '../../types';
import Modal from '../shared/Modal';
import { prueba01Database } from '../../data/prueba01';

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  const {
    databases,
    budgets,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    duplicateDatabase,
    openDatabase,
    importDatabase,
    createBudget,
    updateBudget,
    deleteBudget,
    openBudget,
  } = useStore();

  function handleLoadPrueba01() {
    const exists = databases.find((d) => d.name === 'Prueba 01');
    if (exists) {
      openDatabase(exists.id);
    } else {
      const id = importDatabase(prueba01Database);
      openDatabase(id);
    }
    onNavigate('database');
  }

  // ── DB modal state ──────────────────────────────────────────────────────
  const [dbModal, setDbModal] = useState<'create' | 'edit' | 'delete' | 'duplicate' | null>(null);
  const [dbTarget, setDbTarget] = useState<string | null>(null);
  const [dbName, setDbName] = useState('');
  const [dbDesc, setDbDesc] = useState('');
  const [dbDupName, setDbDupName] = useState('');

  // ── Budget modal state ──────────────────────────────────────────────────
  const [budgetModal, setBudgetModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [budgetTarget, setBudgetTarget] = useState<Budget | null>(null);
  const [budgetName, setBudgetName] = useState('');
  const [budgetDesc, setBudgetDesc] = useState('');
  const [budgetDbId, setBudgetDbId] = useState('');

  // ── DB handlers ─────────────────────────────────────────────────────────
  function openCreateDb() {
    setDbName('');
    setDbDesc('');
    setDbTarget(null);
    setDbModal('create');
  }

  function openEditDb(id: string) {
    const db = databases.find((d) => d.id === id);
    if (!db) return;
    setDbName(db.name);
    setDbDesc(db.description);
    setDbTarget(id);
    setDbModal('edit');
  }

  function openDeleteDb(id: string) {
    setDbTarget(id);
    setDbModal('delete');
  }

  function openDuplicateDb(id: string) {
    const db = databases.find((d) => d.id === id);
    if (!db) return;
    setDbDupName(db.name + ' (Copia)');
    setDbTarget(id);
    setDbModal('duplicate');
  }

  function handleSaveDb() {
    if (!dbName.trim()) return;
    if (dbModal === 'create') {
      createDatabase(dbName.trim(), dbDesc.trim());
    } else if (dbModal === 'edit' && dbTarget) {
      updateDatabase(dbTarget, dbName.trim(), dbDesc.trim());
    }
    setDbModal(null);
  }

  function handleDeleteDb() {
    if (dbTarget) deleteDatabase(dbTarget);
    setDbModal(null);
  }

  function handleDuplicateDb() {
    if (dbTarget && dbDupName.trim()) {
      duplicateDatabase(dbTarget, dbDupName.trim());
    }
    setDbModal(null);
  }

  function handleOpenDb(id: string) {
    openDatabase(id);
    onNavigate('database');
  }

  // ── Budget handlers ──────────────────────────────────────────────────────
  function openCreateBudget() {
    setBudgetName('');
    setBudgetDesc('');
    setBudgetDbId(databases[0]?.id ?? '');
    setBudgetTarget(null);
    setBudgetModal('create');
  }

  function openEditBudget(b: Budget) {
    setBudgetName(b.name);
    setBudgetDesc(b.description);
    setBudgetDbId(b.databaseId);
    setBudgetTarget(b);
    setBudgetModal('edit');
  }

  function openDeleteBudget(b: Budget) {
    setBudgetTarget(b);
    setBudgetModal('delete');
  }

  function handleSaveBudget() {
    if (!budgetName.trim()) return;
    if (budgetModal === 'create') {
      createBudget(budgetName.trim(), budgetDesc.trim(), budgetDbId);
    } else if (budgetModal === 'edit' && budgetTarget) {
      updateBudget(budgetTarget.id, budgetName.trim(), budgetDesc.trim());
    }
    setBudgetModal(null);
  }

  function handleDeleteBudget() {
    if (budgetTarget) deleteBudget(budgetTarget.id);
    setBudgetModal(null);
  }

  function handleOpenBudget(b: Budget) {
    openBudget(b.id);
    onNavigate('budget');
  }

  function budgetTotal(b: Budget): number {
    return b.lineItems.reduce((sum, li) => sum + li.unitCost * li.quantity, 0);
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-10">
      {/* ── Databases section ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Bases de Datos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadPrueba01}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
              title="Carga 329 ítems y 93 rubros desde Excel APUS"
            >
              <Database size={16} />
              Cargar Prueba 01
            </button>
            <button
              onClick={openCreateDb}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              <Plus size={16} />
              Nueva Base de Datos
            </button>
          </div>
        </div>

        {databases.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400 text-sm">
            No hay bases de datos. Crea una para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {databases.map((db) => (
              <div
                key={db.id}
                className="shadow-sm border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{db.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{db.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openDuplicateDb(db.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => openEditDb(db.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteDb(db.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{db.items.length} items</span>
                  <span>{db.rubros.length} rubros</span>
                  <span>
                    {new Date(db.createdAt).toLocaleDateString('es-EC', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenDb(db.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors w-full"
                >
                  <FolderOpen size={14} />
                  Abrir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Budgets section ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Presupuestos</h2>
          </div>
          <div className="flex items-center gap-2">
            {budgets.length >= 2 && (
              <button
                onClick={() => onNavigate('compare')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <BarChart2 size={16} />
                Comparar Presupuestos
              </button>
            )}
            <button
              onClick={openCreateBudget}
              disabled={databases.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Nuevo Presupuesto
            </button>
          </div>
        </div>

        {budgets.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400 text-sm">
            No hay presupuestos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => (
              <div
                key={b.id}
                className="shadow-sm border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{b.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditBudget(b)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteBudget(b)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="truncate">Base: {b.databaseName}</span>
                  <span>
                    {new Date(b.createdAt).toLocaleDateString('es-EC', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="text-sm font-semibold text-green-600">
                  Total: {formatMoney(budgetTotal(b))}
                </div>
                <button
                  onClick={() => handleOpenBudget(b)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors w-full"
                >
                  <FolderOpen size={14} />
                  Abrir
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── DB Modals ────────────────────────────────────────────────────── */}
      {(dbModal === 'create' || dbModal === 'edit') && (
        <Modal
          title={dbModal === 'create' ? 'Nueva Base de Datos' : 'Editar Base de Datos'}
          onClose={() => setDbModal(null)}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Base General 2025"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={dbDesc}
                onChange={(e) => setDbDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                placeholder="Descripción opcional..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDbModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDb}
                disabled={!dbName.trim()}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {dbModal === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dbModal === 'delete' && (
        <Modal title="Eliminar Base de Datos" onClose={() => setDbModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar esta base de datos? Esta acción no se puede deshacer.
            </p>
            <p className="text-xs text-amber-600">
              Los presupuestos que usen esta base de datos no serán eliminados, pero no podrán ser recalculados.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDbModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDb}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dbModal === 'duplicate' && (
        <Modal title="Duplicar Base de Datos" onClose={() => setDbModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la copia <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dbDupName}
                onChange={(e) => setDbDupName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDbModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDuplicateDb}
                disabled={!dbDupName.trim()}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                Duplicar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Budget Modals ────────────────────────────────────────────────── */}
      {(budgetModal === 'create' || budgetModal === 'edit') && (
        <Modal
          title={budgetModal === 'create' ? 'Nuevo Presupuesto' : 'Editar Presupuesto'}
          onClose={() => setBudgetModal(null)}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Presupuesto Edificio A"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={budgetDesc}
                onChange={(e) => setBudgetDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                placeholder="Descripción opcional..."
              />
            </div>
            {budgetModal === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base de Datos <span className="text-red-500">*</span>
                </label>
                <select
                  value={budgetDbId}
                  onChange={(e) => setBudgetDbId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {databases.map((db) => (
                    <option key={db.id} value={db.id}>
                      {db.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBudgetModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={!budgetName.trim() || (budgetModal === 'create' && !budgetDbId)}
                className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {budgetModal === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {budgetModal === 'delete' && budgetTarget && (
        <Modal title="Eliminar Presupuesto" onClose={() => setBudgetModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar el presupuesto{' '}
              <strong className="text-gray-900">{budgetTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBudgetModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBudget}
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
