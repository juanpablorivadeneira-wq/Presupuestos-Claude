import { useState } from 'react';
import { List, Share2 } from 'lucide-react';
import ItemsView from './components/items/ItemsView';
import RubrosView from './components/rubros/RubrosView';

type Tab = 'items' | 'rubros';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('items');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800 mr-4">
          Presupuestos <span className="text-green-600">APU</span>
        </h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'items'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List size={16} />
            Items
          </button>
          <button
            onClick={() => setActiveTab('rubros')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rubros'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 size={16} />
            Rubros
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'items' ? <ItemsView /> : <RubrosView />}
      </main>
    </div>
  );
}
