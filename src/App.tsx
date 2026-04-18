import { useState, useRef, useEffect } from 'react';
import { Database, FileText, TrendingUp, ChevronDown, Check, Plus, User, Menu } from 'lucide-react';
import { useStore } from './store/useStore';
import { AppView } from './types';
import HomeView from './components/home/HomeView';
import ItemsView from './components/items/ItemsView';
import RubrosView from './components/rubros/RubrosView';
import BudgetView from './components/budgets/BudgetView';
import ActualizacionView from './components/actualizacion/ActualizacionView';
import CompareView from './components/compare/CompareView';
import Modal from './components/shared/Modal';
import BuildKontrolLogo from './components/shared/BuildKontrolLogo';

type DbTab = 'items' | 'rubros';
type HomeSection = 'databases' | 'budgets' | 'actualizacion';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [dbTab, setDbTab] = useState<DbTab>('items');
  const [dbSwitcherOpen, setDbSwitcherOpen] = useState(false);
  const [proyectoOpen, setProyectoOpen] = useState(false);
  const [createDbModal, setCreateDbModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbDesc, setNewDbDesc] = useState('');
  const dbSwitcherRef = useRef<HTMLDivElement>(null);
  const proyectoRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<HomeSection>(() => {
    const s = useStore.getState();
    if (s.budgets.length > 0) return 'budgets';
    return 'databases';
  });

  const databases = useStore((s) => s.databases);
  const currentDatabaseId = useStore((s) => s.currentDatabaseId);
  const budgets = useStore((s) => s.budgets);
  const currentBudgetId = useStore((s) => s.currentBudgetId);
  const budgetUpdates = useStore((s) => s.budgetUpdates);
  const { closeDatabase, closeBudget, openDatabase, openBudget, createDatabase } = useStore();

  const currentDb = databases.find((d) => d.id === currentDatabaseId) ?? null;
  const currentBudget = budgets.find((b) => b.id === currentBudgetId) ?? null;

  const activeSidebarSection: HomeSection =
    view === 'database' ? 'databases'
    : view === 'budget' || view === 'compare' ? 'budgets'
    : view === 'actualizacion' ? 'actualizacion'
    : activeSection;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dbSwitcherRef.current && !dbSwitcherRef.current.contains(e.target as Node)) {
        setDbSwitcherOpen(false);
      }
      if (proyectoRef.current && !proyectoRef.current.contains(e.target as Node)) {
        setProyectoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNavigate(nextView: AppView) { setView(nextView); }

  function handleBackToHome() {
    if (view === 'database') closeDatabase();
    if (view === 'budget') closeBudget();
    setView('home');
  }

  function handleSidebarNav(section: HomeSection) {
    setActiveSection(section);
    if (view !== 'home') {
      if (view === 'database') closeDatabase();
      else if (view === 'budget') closeBudget();
      setView('home');
    }
  }

  function handleSwitchDb(id: string) {
    openDatabase(id);
    setDbSwitcherOpen(false);
  }

  function handleSelectProyecto(id: string) {
    openBudget(id);
    setProyectoOpen(false);
    setView('budget');
  }

  function handleCreateDb() {
    if (!newDbName.trim()) return;
    createDatabase(newDbName.trim(), newDbDesc.trim());
    setCreateDbModal(false);
    setNewDbName('');
    setNewDbDesc('');
    setView('database');
    setDbTab('items');
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="bg-[#6b6b6b] text-white shrink-0 z-20 shadow-md">
        <div className="h-12 flex items-center">

          {/* LEFT: Logo sobre fondo blanco + hamburger */}
          <div className="flex items-center gap-0 shrink-0 h-full">
            <div className="bg-white h-full flex items-center px-3 gap-2.5">
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Menu size={18} />
              </button>
              <button onClick={handleBackToHome} className="focus:outline-none">
                <BuildKontrolLogo />
              </button>
            </div>
            <div className="h-full w-px bg-white/20" />
          </div>

          {/* CENTER: Proyecto/Obra selector — siempre visible */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm font-medium">Proyecto:</span>
              <div className="relative" ref={proyectoRef}>
                <button
                  onClick={() => setProyectoOpen((o) => !o)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 px-3 py-1.5 rounded text-sm font-semibold transition-colors min-w-[180px] justify-between"
                >
                  <span className="truncate max-w-[220px]">
                    {currentBudget?.name ?? 'Seleccionar proyecto'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 ml-1 transition-transform ${proyectoOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {proyectoOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-2xl min-w-[280px]">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proyectos / Obras</p>
                    </div>
                    {budgets.length === 0 ? (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-gray-400">No hay presupuestos creados.</p>
                        <button
                          onClick={() => { setProyectoOpen(false); handleSidebarNav('budgets'); }}
                          className="mt-2 text-xs text-green-600 hover:underline"
                        >
                          Ir a Presupuestos →
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 max-h-64 overflow-y-auto">
                        {budgets.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleSelectProyecto(b.id)}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                              b.id === currentBudgetId
                                ? 'bg-green-50 text-green-800'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Check
                              size={13}
                              className={b.id === currentBudgetId ? 'text-green-600 shrink-0' : 'invisible shrink-0'}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{b.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {b.lineItems.length} rubros · {b.databaseName}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="h-6 w-px bg-white/20 mx-1 shrink-0" />

          {/* RIGHT: User */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded cursor-pointer transition-colors">
              <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center shrink-0">
                <User size={13} className="text-white" />
              </div>
              <span className="text-sm text-gray-100 hidden sm:block font-medium">Usuario</span>
            </div>
          </div>

        </div>

        {/* Sub-bar: breadcrumb contextual cuando estás en un módulo */}
        {view !== 'home' && (
          <div className="bg-[#f5f5f5] border-b border-gray-200 px-4 h-8 flex items-center gap-2 text-xs text-gray-500">
            <button onClick={handleBackToHome} className="hover:text-gray-800 transition-colors">
              Inicio
            </button>
            <span className="text-gray-300">/</span>

            {view === 'database' ? (
              <>
                {/* DB switcher inline */}
                <div className="relative" ref={dbSwitcherRef}>
                  <button
                    onClick={() => setDbSwitcherOpen((o) => !o)}
                    className="flex items-center gap-1 hover:text-gray-800 transition-colors font-medium text-gray-700"
                  >
                    <Database size={11} className="shrink-0" />
                    {currentDb?.name ?? 'Base de Datos'}
                    <ChevronDown size={11} className={`shrink-0 transition-transform ${dbSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dbSwitcherOpen && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[240px]">
                      <div className="px-3 py-1.5 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Bases de Datos</p>
                      </div>
                      <div className="py-1 max-h-56 overflow-y-auto">
                        {databases.map((db) => (
                          <button
                            key={db.id}
                            onClick={() => handleSwitchDb(db.id)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                              db.id === currentDatabaseId
                                ? 'bg-indigo-50 text-indigo-800 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <Check size={12} className={db.id === currentDatabaseId ? 'text-indigo-600 shrink-0' : 'invisible shrink-0'} />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{db.name}</div>
                              <div className="text-xs text-gray-400 font-normal">{db.items.length} items · {db.rubros.length} rubros</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => { setDbSwitcherOpen(false); setNewDbName(''); setNewDbDesc(''); setCreateDbModal(true); }}
                          className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Plus size={13} className="text-gray-500 shrink-0" />
                          Nueva Base de Datos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600 font-medium">{dbTab === 'items' ? 'Items' : 'Assemblies'}</span>
              </>
            ) : view === 'budget' ? (
              <span className="text-gray-700 font-medium truncate max-w-xs">
                {currentBudget?.name ?? 'Presupuesto'}
              </span>
            ) : view === 'actualizacion' ? (
              <span className="text-amber-700 font-medium">Actualización de Presupuestos</span>
            ) : view === 'compare' ? (
              <span className="text-gray-700 font-medium">Comparar Presupuestos</span>
            ) : null}
          </div>
        )}
      </header>

      {/* Create DB Modal */}
      {createDbModal && (
        <Modal title="Nueva Base de Datos" onClose={() => setCreateDbModal(false)} size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDb()}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="ej. ARQUETIKA 2025"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={newDbDesc}
                onChange={(e) => setNewDbDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Descripción opcional..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCreateDbModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCreateDb}
                disabled={!newDbName.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Crear y Abrir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Body = persistent sidebar + view content */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Persistent sidebar ──────────────────────────────────────── */}
        <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col py-5">
          <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Módulos</p>
          <nav className="flex-1 px-2 space-y-0.5">

            <button
              onClick={() => handleSidebarNav('databases')}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSidebarSection === 'databases'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {activeSidebarSection === 'databases' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-r" />
              )}
              <Database size={16} className="shrink-0" />
              <span className="flex-1 text-left">Bases de Datos</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeSidebarSection === 'databases' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {databases.length}
              </span>
            </button>

            <button
              onClick={() => handleSidebarNav('budgets')}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSidebarSection === 'budgets'
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {activeSidebarSection === 'budgets' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-600 rounded-r" />
              )}
              <FileText size={16} className="shrink-0" />
              <span className="flex-1 text-left">Presupuestos</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeSidebarSection === 'budgets' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {budgets.length}
              </span>
            </button>

            <button
              onClick={() => handleSidebarNav('actualizacion')}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSidebarSection === 'actualizacion'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {activeSidebarSection === 'actualizacion' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-600 rounded-r" />
              )}
              <TrendingUp size={16} className="shrink-0" />
              <span className="flex-1 text-left leading-tight">Actualización</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeSidebarSection === 'actualizacion' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {budgetUpdates.length}
              </span>
            </button>

          </nav>
        </aside>

        {/* ── View content ─────────────────────────────────────────────── */}
        <main className="flex-1 flex overflow-hidden">
          {view === 'home' && (
            <HomeView
              onNavigate={handleNavigate}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          )}
          {view === 'database' && (
            dbTab === 'items'
              ? <ItemsView activeTab="items" onTabChange={setDbTab} />
              : <RubrosView activeTab="rubros" onTabChange={setDbTab} />
          )}
          {view === 'budget' && <BudgetView onNavigate={handleNavigate} />}
          {view === 'actualizacion' && <ActualizacionView onNavigate={handleNavigate} />}
          {view === 'compare' && <CompareView onNavigate={handleNavigate} />}
        </main>

      </div>
    </div>
  );
}
