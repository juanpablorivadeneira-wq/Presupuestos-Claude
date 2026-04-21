import { useState, useRef, useEffect } from 'react';
import { Database, FileText, TrendingUp, Ruler, ChevronDown, Check, Plus, User, Menu, HardDrive, Search, Bell, Bookmark, HelpCircle, BarChart3 } from 'lucide-react';
import { useStore, loadFromServer, loginToServer, clearAuthToken, getAuthToken } from './store/useStore';
import LoginView from './components/auth/LoginView';
import { AppView } from './types';
import HomeView from './components/home/HomeView';
import ItemsView from './components/items/ItemsView';
import RubrosView from './components/rubros/RubrosView';
import BudgetView from './components/budgets/BudgetView';
import ActualizacionView from './components/actualizacion/ActualizacionView';
import RevitAnalyzerView from './components/revit/RevitAnalyzerView';
import MedicionView from './components/medicion/MedicionView';
import CompareView from './components/compare/CompareView';
import Modal from './components/shared/Modal';
import BuildKontrolLogo from './components/shared/BuildKontrolLogo';
import BackupModal from './components/shared/BackupModal';

type DbTab = 'items' | 'rubros';
type HomeSection = 'databases' | 'budgets' | 'actualizacion' | 'medicion' | 'revit';

type AuthState = 'loading' | 'authenticated' | 'needs_login';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [view, setView] = useState<AppView>('home');
  const [dbTab, setDbTab] = useState<DbTab>('items');
  const [dbSwitcherOpen, setDbSwitcherOpen] = useState(false);
  const [createDbModal, setCreateDbModal] = useState(false);
  const [backupModal, setBackupModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbDesc, setNewDbDesc] = useState('');
  const dbSwitcherRef = useRef<HTMLDivElement>(null);

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
  const medicionProjects = useStore((s) => s.medicionProjects);
  const { closeDatabase, closeBudget, closeMedicionProject, openDatabase, createDatabase } = useStore();

  const currentDb = databases.find((d) => d.id === currentDatabaseId) ?? null;
  const currentBudget = budgets.find((b) => b.id === currentBudgetId) ?? null;

  const activeSidebarSection: HomeSection =
    view === 'database' ? 'databases'
    : view === 'budget' || view === 'compare' ? 'budgets'
    : view === 'actualizacion' ? 'actualizacion'
    : view === 'medicion' ? 'medicion'
    : view === 'revit' ? 'revit'
    : activeSection;

  // ── Initialize from server on mount ──────────────────────────────────────
  useEffect(() => {
    loadFromServer().then((result) => {
      if (result.status === 'needs_auth') {
        setAuthState('needs_login');
        setReady(true);
      } else {
        const data = result.data;
        if (data) useStore.getState().hydrate(data);
        setAuthState('authenticated');
        setReady(true);
      }
    });
  }, []);

  async function handleLogin(username: string, password: string) {
    const loginResult = await loginToServer(username, password);
    if (!loginResult.ok) return loginResult;
    const result = await loadFromServer();
    if (result.status === 'needs_auth') return { ok: false, error: 'Token inválido' };
    if (result.data) useStore.getState().hydrate(result.data);
    setAuthState('authenticated');
    return { ok: true };
  }

  function handleLogout() {
    clearAuthToken();
    setAuthState('needs_login');
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dbSwitcherRef.current && !dbSwitcherRef.current.contains(e.target as Node)) {
        setDbSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNavigate(nextView: AppView) { setView(nextView); }

  function handleBackToHome() {
    if (view === 'database') closeDatabase();
    if (view === 'budget') closeBudget();
    if (view === 'medicion') closeMedicionProject();
    setView('home');
  }

  function handleSidebarNav(section: HomeSection) {
    setActiveSection(section);
    if (section === 'revit') {
      setView('revit');
      return;
    }
    if (view !== 'home') {
      if (view === 'database') closeDatabase();
      else if (view === 'budget') closeBudget();
      else if (view === 'medicion') closeMedicionProject();
      setView('home');
    }
  }

  function handleSwitchDb(id: string) {
    openDatabase(id);
    setDbSwitcherOpen(false);
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

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e2d45]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Cargando BuildKontrol...</p>
        </div>
      </div>
    );
  }

  if (authState === 'needs_login') {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <header className="bg-[#1e2d45] text-white shrink-0 z-20 shadow-md">
        <div className="h-12 flex items-center">

          {/* LEFT: hamburger + logo */}
          <div className="flex items-center gap-3 px-4 shrink-0 self-stretch">
            <button className="text-white/60 hover:text-white transition-colors">
              <Menu size={18} />
            </button>
            <button onClick={handleBackToHome} className="focus:outline-none flex items-center">
              <BuildKontrolLogo />
            </button>
          </div>

          {/* Separator — mismo alto que el logo para alinearse */}
          <div className="w-px bg-white/20 shrink-0 self-stretch" />

          {/* Spacer */}
          <div className="flex-1" />

          {/* PROYECTO selector — derecha del centro */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 cursor-default transition-colors min-w-[190px] mr-3 shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Proyecto</p>
              <p className="text-sm text-white/80 font-medium leading-tight mt-0.5 truncate">Sin proyecto seleccionado</p>
            </div>
            <ChevronDown size={13} className="shrink-0 text-white/50" />
          </div>

          {/* Separator */}
          <div className="w-px bg-white/20 shrink-0 self-stretch" />

          {/* RIGHT: icon toolbar + user */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button onClick={() => setBackupModal(true)} title="Backup y Restauración" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <HardDrive size={16} />
            </button>
            <button title="Buscar" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <Search size={16} />
            </button>
            <button title="Notificaciones" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <Bell size={16} />
            </button>
            <button title="Marcadores" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <Bookmark size={16} />
            </button>
            <button title="Ayuda" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <HelpCircle size={16} />
            </button>
            <div className="w-px h-5 bg-white/20 mx-1 shrink-0" />
            <button
              onClick={getAuthToken() ? handleLogout : undefined}
              title={getAuthToken() ? 'Cerrar sesión' : undefined}
              className="flex items-center gap-2 hover:bg-white/15 px-2 py-1 rounded transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm text-white/80 hidden sm:block font-medium">
                {getAuthToken() ? 'Salir' : 'Usuario'}
              </span>
            </button>
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
            ) : view === 'medicion' ? (
              <span className="text-teal-700 font-medium">Medición</span>
            ) : null}
          </div>
        )}
      </header>

      {backupModal && <BackupModal onClose={() => setBackupModal(false)} />}

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
          <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gestión de Presupuestos</p>
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

            {/* Medición — submenu de Presupuestos */}
            <button
              onClick={() => handleSidebarNav('medicion')}
              className={`relative w-full flex items-center gap-2 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSidebarSection === 'medicion'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {activeSidebarSection === 'medicion' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-teal-500 rounded-r" />
              )}
              <span className="w-px h-3 bg-gray-300 shrink-0" />
              <Ruler size={14} className="shrink-0" />
              <span className="flex-1 text-left text-xs">Medición</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeSidebarSection === 'medicion' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {medicionProjects.length}
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

            <div className="mt-3 mb-1 w-full border-t border-gray-100" />
            <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Herramientas</p>

            <button
              onClick={() => handleSidebarNav('revit')}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSidebarSection === 'revit'
                  ? 'bg-[#1F4E78]/10 text-[#1F4E78]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {activeSidebarSection === 'revit' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#1F4E78] rounded-r" />
              )}
              <BarChart3 size={16} className="shrink-0" />
              <span className="flex-1 text-left leading-tight">Cantidades Revit</span>
            </button>

          </nav>
        </aside>

        {/* ── View content ─────────────────────────────────────────────── */}
        <main className="flex-1 flex overflow-hidden">
          {view === 'home' && (
            <HomeView
              onNavigate={handleNavigate}
              activeSection={activeSection as 'databases' | 'budgets' | 'actualizacion' | 'medicion'}
              onSectionChange={setActiveSection as (s: 'databases' | 'budgets' | 'actualizacion' | 'medicion') => void}
            />
          )}
          {view === 'database' && (
            dbTab === 'items'
              ? <ItemsView activeTab="items" onTabChange={setDbTab} />
              : <RubrosView activeTab="rubros" onTabChange={setDbTab} />
          )}
          {view === 'budget' && <BudgetView onNavigate={handleNavigate} />}
          {view === 'actualizacion' && <ActualizacionView onNavigate={handleNavigate} />}
          {view === 'medicion' && <MedicionView />}
          {view === 'compare' && <CompareView onNavigate={handleNavigate} />}
          {view === 'revit' && <RevitAnalyzerView />}
        </main>

      </div>
    </div>
  );
}
