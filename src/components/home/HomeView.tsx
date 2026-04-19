import { useState } from 'react';
import {
  Plus, Pencil, Trash2, Copy, FolderOpen, BarChart2,
  Database, FileText, TrendingUp,
} from 'lucide-react';
import { useStore, formatMoney } from '../../store/useStore';
import { AppView, Budget, BudgetUpdate } from '../../types';
import Modal from '../shared/Modal';
import { prueba01Database } from '../../data/prueba01';

type HomeSection = 'databases' | 'budgets' | 'actualizacion';

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  activeSection: HomeSection;
  onSectionChange: (section: HomeSection) => void;
}

export default function HomeView({ onNavigate, activeSection, onSectionChange }: HomeViewProps) {

  const {
    databases, budgets, budgetUpdates,
    createDatabase, updateDatabase, deleteDatabase, duplicateDatabase, openDatabase, importDatabase, updateDatabaseContents,
    createBudget, updateBudget, deleteBudget, openBudget,
    createBudgetUpdate, updateBudgetUpdate, deleteBudgetUpdate, openBudgetUpdate,
  } = useStore();

  function handleLoadPrueba01() {
    const existing = databases.find((d) => d.name === 'Prueba 01');
    if (existing) {
      updateDatabaseContents(existing.id, prueba01Database);
      openDatabase(existing.id);
    } else {
      importDatabase(prueba01Database);
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

  // ── BudgetUpdate modal state ────────────────────────────────────────────
  const [buModal, setBuModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [buTarget, setBuTarget] = useState<BudgetUpdate | null>(null);
  const [buName, setBuName] = useState('');
  const [buDesc, setBuDesc] = useState('');
  const [buSourceBudgetId, setBuSourceBudgetId] = useState('');
  const [buNewDbId, setBuNewDbId] = useState('');

  // ── DB handlers ─────────────────────────────────────────────────────────
  function openCreateDb() { setDbName(''); setDbDesc(''); setDbTarget(null); setDbModal('create'); }
  function openEditDb(id: string) {
    const db = databases.find((d) => d.id === id);
    if (!db) return;
    setDbName(db.name); setDbDesc(db.description); setDbTarget(id); setDbModal('edit');
  }
  function openDeleteDb(id: string) { setDbTarget(id); setDbModal('delete'); }
  function openDuplicateDb(id: string) {
    const db = databases.find((d) => d.id === id);
    if (!db) return;
    setDbDupName(db.name + ' (Copia)'); setDbTarget(id); setDbModal('duplicate');
  }
  function handleSaveDb() {
    if (!dbName.trim()) return;
    if (dbModal === 'create') createDatabase(dbName.trim(), dbDesc.trim());
    else if (dbModal === 'edit' && dbTarget) updateDatabase(dbTarget, dbName.trim(), dbDesc.trim());
    setDbModal(null);
  }
  function handleDeleteDb() { if (dbTarget) deleteDatabase(dbTarget); setDbModal(null); }
  function handleDuplicateDb() {
    if (dbTarget && dbDupName.trim()) duplicateDatabase(dbTarget, dbDupName.trim());
    setDbModal(null);
  }
  function handleOpenDb(id: string) { openDatabase(id); onNavigate('database'); }

  // ── Budget handlers ──────────────────────────────────────────────────────
  function openCreateBudget() {
    setBudgetName(''); setBudgetDesc(''); setBudgetDbId(databases[0]?.id ?? '');
    setBudgetTarget(null); setBudgetModal('create');
  }
  function openEditBudget(b: Budget) {
    setBudgetName(b.name); setBudgetDesc(b.description); setBudgetDbId(b.databaseId);
    setBudgetTarget(b); setBudgetModal('edit');
  }
  function openDeleteBudget(b: Budget) { setBudgetTarget(b); setBudgetModal('delete'); }
  function handleSaveBudget() {
    if (!budgetName.trim()) return;
    if (budgetModal === 'create') createBudget(budgetName.trim(), budgetDesc.trim(), budgetDbId);
    else if (budgetModal === 'edit' && budgetTarget) updateBudget(budgetTarget.id, budgetName.trim(), budgetDesc.trim());
    setBudgetModal(null);
  }
  function handleDeleteBudget() { if (budgetTarget) deleteBudget(budgetTarget.id); setBudgetModal(null); }
  function handleOpenBudget(b: Budget) { openBudget(b.id); onNavigate('budget'); }
  function budgetTotal(b: Budget) { return b.lineItems.reduce((sum, li) => sum + li.unitCost * li.quantity, 0); }

  // ── BudgetUpdate handlers ────────────────────────────────────────────────
  function openCreateBu() {
    setBuName(''); setBuDesc(''); setBuSourceBudgetId(budgets[0]?.id ?? '');
    setBuNewDbId(databases[0]?.id ?? ''); setBuTarget(null); setBuModal('create');
  }
  function openEditBu(u: BudgetUpdate) { setBuName(u.name); setBuDesc(u.description); setBuTarget(u); setBuModal('edit'); }
  function openDeleteBu(u: BudgetUpdate) { setBuTarget(u); setBuModal('delete'); }
  function handleSaveBu() {
    if (!buName.trim()) return;
    if (buModal === 'create') createBudgetUpdate(buName.trim(), buDesc.trim(), buSourceBudgetId, buNewDbId);
    else if (buModal === 'edit' && buTarget) updateBudgetUpdate(buTarget.id, buName.trim(), buDesc.trim());
    setBuModal(null);
  }
  function handleDeleteBu() { if (buTarget) deleteBudgetUpdate(buTarget.id); setBuModal(null); }
  function handleOpenBu(u: BudgetUpdate) { openBudgetUpdate(u.id); onNavigate('actualizacion'); }

  return (
    <div className="flex-1 overflow-auto p-6">

        {/* ── Databases section ───────────────────────────────────────────── */}
        {activeSection === 'databases' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Database size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Bases de Datos</h2>
                  <p className="text-xs text-gray-500">Precios y rubros APU para tus proyectos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadPrueba01}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Carga 329 ítems y 93 rubros desde Excel APUS"
                >
                  Cargar Prueba 01
                </button>
                <button
                  onClick={openCreateDb}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={15} />
                  Nueva Base de Datos
                </button>
              </div>
            </div>

            {databases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Database size={28} className="text-indigo-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sin bases de datos</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">Crea tu primera base de datos APU o carga la de prueba para comenzar.</p>
                <div className="flex gap-2">
                  <button onClick={handleLoadPrueba01} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                    Cargar Prueba 01
                  </button>
                  <button onClick={openCreateDb} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    <Plus size={14} /> Nueva Base de Datos
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── KPI cards ── */}
                {(() => {
                  const lastCreated = [...databases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                  const lastModified = [...databases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
                  const topByItems = [...databases].sort((a, b) => b.items.length - a.items.length).slice(0, 3);
                  const topByRubros = [...databases].sort((a, b) => b.rubros.length - a.rubros.length).slice(0, 3);
                  const maxItems = topByItems[0]?.items.length ?? 1;
                  const maxRubros = topByRubros[0]?.rubros.length ?? 1;
                  const budgetCountByDb = databases.map((db) => ({
                    db,
                    count: budgets.filter((b) => b.databaseId === db.id).length,
                  })).sort((a, b) => b.count - a.count);
                  const mostUsedDb = budgetCountByDb[0];
                  function fmtDateTime(iso: string) {
                    const d = new Date(iso);
                    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                      + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
                  }

                  return (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total BDs</p>
                          <p className="text-3xl font-bold text-indigo-600">{databases.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Más usada</p>
                          <p className="text-2xl font-bold text-indigo-600">{mostUsedDb?.count ?? 0} <span className="text-sm font-normal text-gray-400">presup.</span></p>
                          <p className="text-xs text-gray-500 mt-1 truncate font-medium">{mostUsedDb?.db.name ?? '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Últ. modificada</p>
                          <p className="text-xs font-bold text-gray-800 mt-1 truncate">{lastModified?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{lastModified ? fmtDateTime(lastModified.updatedAt) : '—'}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Últ. creada</p>
                          <p className="text-xs font-bold text-gray-800 mt-1 truncate">{lastCreated?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{lastCreated ? fmtDateTime(lastCreated.createdAt) : '—'}</p>
                        </div>
                      </div>

                      {/* ── Rankings ── */}
                      {databases.length >= 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top por Items</p>
                            <div className="space-y-3">
                              {topByItems.map((db, i) => (
                                <div key={db.id}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-bold text-indigo-400 w-4 shrink-0">#{i + 1}</span>
                                      <span className="text-sm text-gray-700 truncate">{db.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-2">{db.items.length}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(db.items.length / maxItems) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top por Rubros</p>
                            <div className="space-y-3">
                              {topByRubros.map((db, i) => (
                                <div key={db.id}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-bold text-indigo-400 w-4 shrink-0">#{i + 1}</span>
                                      <span className="text-sm text-gray-700 truncate">{db.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-2">{db.rubros.length}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(db.rubros.length / maxRubros) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* ── Card grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {databases.map((db) => (
                    <div
                      key={db.id}
                      className="bg-white rounded-xl border border-gray-200 border-t-[3px] border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{db.name}</p>
                            {db.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{db.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => openDuplicateDb(db.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Duplicar"><Copy size={13} /></button>
                            <button onClick={() => openEditDb(db.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => openDeleteDb(db.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{db.items.length} items</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{db.rubros.length} rubros</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {new Date(db.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleOpenDb(db.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <FolderOpen size={14} />
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Budgets section ──────────────────────────────────────────────── */}
        {activeSection === 'budgets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Presupuestos</h2>
                  <p className="text-xs text-gray-500">Presupuestos APU de tus proyectos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {budgets.length >= 2 && (
                  <button onClick={() => onNavigate('compare')} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    <BarChart2 size={15} /> Comparar
                  </button>
                )}
                <button onClick={openCreateBudget} disabled={databases.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={15} /> Nuevo Presupuesto
                </button>
              </div>
            </div>

            {databases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4"><FileText size={28} className="text-green-300" /></div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Primero crea una base de datos</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">Los presupuestos necesitan una base de datos APU para calcular precios.</p>
                <button onClick={() => onSectionChange('databases')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">Ir a Bases de Datos</button>
              </div>
            ) : budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4"><FileText size={28} className="text-green-300" /></div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sin presupuestos</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">Crea tu primer presupuesto seleccionando rubros de la base de datos.</p>
                <button onClick={openCreateBudget} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"><Plus size={14} /> Nuevo Presupuesto</button>
              </div>
            ) : (() => {
              const totals = budgets.map((b) => budgetTotal(b));
              const grandTotal = totals.reduce((s, t) => s + t, 0);
              const lastCreatedB = [...budgets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              const lastModifiedB = [...budgets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
              function fmtDT(iso: string) {
                const d = new Date(iso);
                return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                  + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
              }
              return (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total presupuestos</p>
                      <p className="text-3xl font-bold text-green-600">{budgets.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Valor acumulado</p>
                      <p className="text-xl font-bold text-green-600">{formatMoney(grandTotal)}</p>
                      <p className="text-xs text-gray-400 mt-1">suma de todos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Últ. creado</p>
                      <p className="text-xs font-bold text-gray-800 truncate">{lastCreatedB?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{lastCreatedB ? fmtDT(lastCreatedB.createdAt) : '—'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Últ. modificado</p>
                      <p className="text-xs font-bold text-gray-800 truncate">{lastModifiedB?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{lastModifiedB ? fmtDT(lastModifiedB.updatedAt) : '—'}</p>
                    </div>
                  </div>

                  {/* Lista de presupuestos */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Presupuesto</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 hidden md:table-cell">Base de Datos</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 hidden lg:table-cell">Rubros</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 hidden lg:table-cell">Creado</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">Total</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgets.map((b, i) => {
                          const total = totals[i];
                          return (
                            <tr key={b.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-3">
                                <button onClick={() => handleOpenBudget(b)} className="text-left group/name">
                                  <p className="font-semibold text-gray-900 truncate max-w-[200px] group-hover/name:text-green-700 transition-colors">{b.name}</p>
                                  {b.description && <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{b.description}</p>}
                                </button>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Database size={11} className="shrink-0 text-gray-400" />
                                  <span className="truncate max-w-[140px]">{b.databaseName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center hidden lg:table-cell">
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">{b.lineItems.length}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                                {new Date(b.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-bold text-green-600 whitespace-nowrap">{formatMoney(total)}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditBudget(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Editar"><Pencil size={13} /></button>
                                    <button onClick={() => openDeleteBudget(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500" title="Eliminar"><Trash2 size={13} /></button>
                                  </div>
                                  <button onClick={() => handleOpenBudget(b)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors">
                                    <FolderOpen size={13} /> Abrir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50 border-t-2 border-green-200">
                          <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-green-800">Total presupuestado en el sistema</td>
                          <td className="px-4 py-3 text-right text-base font-bold text-green-700 whitespace-nowrap">{formatMoney(grandTotal)}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── Actualización section ─────────────────────────────────────────── */}
        {activeSection === 'actualizacion' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Actualización de Presupuestos</h2>
                  <p className="text-xs text-gray-500">Impacto de nuevos precios en el trabajo restante</p>
                </div>
              </div>
              <button
                onClick={openCreateBu}
                disabled={budgets.length === 0 || databases.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={15} />
                Nueva Actualización
              </button>
            </div>

            {(budgets.length === 0 || databases.length === 0) && budgetUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <TrendingUp size={28} className="text-amber-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Requisitos previos faltantes</h3>
                <p className="text-sm text-gray-400 max-w-xs">Necesitas al menos una base de datos y un presupuesto para crear una actualización.</p>
              </div>
            ) : budgetUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <TrendingUp size={28} className="text-amber-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">Sin actualizaciones</h3>
                <p className="text-sm text-gray-400 mb-5 max-w-xs">Registra el avance por rubro y calcula el impacto de precios actualizados en el trabajo restante.</p>
                <button onClick={openCreateBu} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                  <Plus size={14} /> Nueva Actualización
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgetUpdates.map((u) => {
                  const avgProgress = u.lineItems.length > 0
                    ? u.lineItems.reduce((sum, li) => sum + (li.progress ?? 0), 0) / u.lineItems.length
                    : 0;
                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-xl border border-gray-200 border-t-[3px] border-t-amber-500 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                            {u.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{u.description}</p>}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => openEditBu(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => openDeleteBu(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <FileText size={11} className="shrink-0" />
                            <span className="truncate">{u.sourceBudgetName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Database size={11} className="shrink-0" />
                            <span className="truncate">{u.newDatabaseName}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-500">Avance promedio</span>
                            <span className="text-xs font-semibold text-amber-700">{avgProgress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">{u.lineItems.length} rubros</span>
                          <span className="text-xs text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleOpenBu(u)}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                        >
                          <FolderOpen size={14} />
                          Abrir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* ── BudgetUpdate Modals ──────────────────────────────────────────── */}
      {(buModal === 'create' || buModal === 'edit') && (
        <Modal
          title={buModal === 'create' ? 'Nueva Actualización de Presupuesto' : 'Editar Actualización'}
          onClose={() => setBuModal(null)}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={buName} onChange={(e) => setBuName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Actualización Julio 2025" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={buDesc} onChange={(e) => setBuDesc(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" placeholder="Descripción opcional..." />
            </div>
            {buModal === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto origen <span className="text-red-500">*</span></label>
                  <select value={buSourceBudgetId} onChange={(e) => setBuSourceBudgetId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {budgets.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.lineItems.length} rubros)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base de precios actualizada <span className="text-red-500">*</span></label>
                  <select value={buNewDbId} onChange={(e) => setBuNewDbId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400">
                    {databases.map((db) => <option key={db.id} value={db.id}>{db.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Puedes cambiarla más tarde dentro de la actualización.</p>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBuModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveBu} disabled={!buName.trim() || (buModal === 'create' && (!buSourceBudgetId || !buNewDbId))} className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-500 disabled:opacity-50">
                {buModal === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {buModal === 'delete' && buTarget && (
        <Modal title="Eliminar Actualización" onClose={() => setBuModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">¿Está seguro que desea eliminar <strong>{buTarget.name}</strong>? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBuModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDeleteBu} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DB Modals ────────────────────────────────────────────────────── */}
      {(dbModal === 'create' || dbModal === 'edit') && (
        <Modal title={dbModal === 'create' ? 'Nueva Base de Datos' : 'Editar Base de Datos'} onClose={() => setDbModal(null)} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={dbName} onChange={(e) => setDbName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Base General 2025" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={dbDesc} onChange={(e) => setDbDesc(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" placeholder="Descripción opcional..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDbModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveDb} disabled={!dbName.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                {dbModal === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dbModal === 'delete' && (
        <Modal title="Eliminar Base de Datos" onClose={() => setDbModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">¿Está seguro que desea eliminar esta base de datos? Esta acción no se puede deshacer.</p>
            <p className="text-xs text-amber-600">Los presupuestos que usen esta base de datos no serán eliminados, pero no podrán ser recalculados.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDbModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDeleteDb} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </Modal>
      )}

      {dbModal === 'duplicate' && (
        <Modal title="Duplicar Base de Datos" onClose={() => setDbModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la copia <span className="text-red-500">*</span></label>
              <input type="text" value={dbDupName} onChange={(e) => setDbDupName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDbModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDuplicateDb} disabled={!dbDupName.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">Duplicar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Budget Modals ────────────────────────────────────────────────── */}
      {(budgetModal === 'create' || budgetModal === 'edit') && (
        <Modal title={budgetModal === 'create' ? 'Nuevo Presupuesto' : 'Editar Presupuesto'} onClose={() => setBudgetModal(null)} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={budgetName} onChange={(e) => setBudgetName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Presupuesto Edificio A" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea value={budgetDesc} onChange={(e) => setBudgetDesc(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 resize-none" placeholder="Descripción opcional..." />
            </div>
            {budgetModal === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos <span className="text-red-500">*</span></label>
                <select value={budgetDbId} onChange={(e) => setBudgetDbId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500">
                  {databases.map((db) => <option key={db.id} value={db.id}>{db.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBudgetModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveBudget} disabled={!budgetName.trim() || (budgetModal === 'create' && !budgetDbId)} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                {budgetModal === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {budgetModal === 'delete' && budgetTarget && (
        <Modal title="Eliminar Presupuesto" onClose={() => setBudgetModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">¿Está seguro que desea eliminar el presupuesto <strong className="text-gray-900">{budgetTarget.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBudgetModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDeleteBudget} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
