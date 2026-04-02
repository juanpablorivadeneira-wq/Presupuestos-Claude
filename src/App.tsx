import { useState } from 'react';
import { ChevronLeft, List, Share2, BarChart2 } from 'lucide-react';
import { useStore } from './store/useStore';
import { AppView } from './types';
import HomeView from './components/home/HomeView';
import ItemsView from './components/items/ItemsView';
import RubrosView from './components/rubros/RubrosView';
import BudgetView from './components/budgets/BudgetView';
import CompareView from './components/compare/CompareView';

type DbTab = 'items' | 'rubros';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [dbTab, setDbTab] = useState<DbTab>('items');

  const databases = useStore((s) => s.databases);
  const currentDatabaseId = useStore((s) => s.currentDatabaseId);
  const budgets = useStore((s) => s.budgets);
  const currentBudgetId = useStore((s) => s.currentBudgetId);
  const { closeDatabase, closeBudget } = useStore();

  const currentDb = databases.find((d) => d.id === currentDatabaseId) ?? null;
  const currentBudget = budgets.find((b) => b.id === currentBudgetId) ?? null;

  function handleNavigate(nextView: AppView) {
    setView(nextView);
  }

  function handleBackToHome() {
    if (view === 'database') closeDatabase();
    if (view === 'budget') closeBudget();
    setView('home');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shadow-sm shrink-0">
        {view === 'home' ? (
          <>
            <h1 className="text-xl font-bold text-gray-800 mr-2">
              Presupuestos <span className="text-green-600">APU</span>
            </h1>
            {budgets.length >= 2 && (
              <button
                onClick={() => setView('compare')}
                className="ml-auto flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                <BarChart2 size={16} />
                Comparar Presupuestos
              </button>
            )}
          </>
        ) : view === 'database' ? (
          <>
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft size={16} />
              Inicio
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">
              {currentDb?.name ?? 'Base de Datos'}
            </span>
            <div className="ml-6 flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDbTab('items')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dbTab === 'items'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List size={15} />
                Items
              </button>
              <button
                onClick={() => setDbTab('rubros')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dbTab === 'rubros'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Share2 size={15} />
                Rubros
              </button>
            </div>
          </>
        ) : view === 'budget' ? (
          <>
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft size={16} />
              Inicio
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-xs">
              {currentBudget?.name ?? 'Presupuesto'}
            </span>
          </>
        ) : view === 'compare' ? (
          <>
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft size={16} />
              Inicio
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800">Comparar Presupuestos</span>
          </>
        ) : null}
      </header>

      {/* Content */}
      <main className="flex-1 flex overflow-hidden">
        {view === 'home' && <HomeView onNavigate={handleNavigate} />}
        {view === 'database' && (
          dbTab === 'items' ? <ItemsView /> : <RubrosView />
        )}
        {view === 'budget' && <BudgetView onNavigate={handleNavigate} />}
        {view === 'compare' && <CompareView onNavigate={handleNavigate} />}
      </main>
    </div>
  );
}
