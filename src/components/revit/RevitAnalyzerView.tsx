import { useState } from 'react';
import { Download, RefreshCw, LayoutDashboard, List, AlertTriangle, FileX2 } from 'lucide-react';
import type { AnalysisResponse } from './types';
import UploadZone from './UploadZone';
import Dashboard from './Dashboard';
import ResumenTable from './ResumenTable';
import SinDatosTable from './SinDatosTable';
import WarningsPanel from './WarningsPanel';

type Tab = 'dashboard' | 'resumen' | 'sin_datos' | 'warnings';

const API_BASE = import.meta.env.VITE_REVIT_API_URL ?? 'http://localhost:8001';

export default function RevitAnalyzerView() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/revit/download/${result.job_id}`);
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cantidades_revit_${result.filename.replace('.csv', '')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!result) {
    return <UploadZone onResult={setResult} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'resumen', label: 'Resumen', icon: <List className="w-4 h-4" />, count: result.with_data },
    { id: 'sin_datos', label: 'Sin datos', icon: <FileX2 className="w-4 h-4" />, count: result.without_data },
    { id: 'warnings', label: 'Warnings', icon: <AlertTriangle className="w-4 h-4" />, count: result.warnings.length },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[240px]">{result.filename}</p>
            <p className="text-xs text-gray-500">
              {result.total_sections} secciones · {result.with_data} con datos · {result.pct_modeled.toFixed(1)}% modelado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setResult(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Nuevo
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#1F4E78] rounded-md hover:bg-[#2E75B6] transition-colors disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Descargando...' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 shrink-0">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1F4E78] text-[#1F4E78]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count != null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? 'bg-[#1F4E78] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'dashboard' && <Dashboard data={result} />}
        {activeTab === 'resumen' && <ResumenTable summaries={result.summaries} />}
        {activeTab === 'sin_datos' && <SinDatosTable summaries={result.summaries} />}
        {activeTab === 'warnings' && <WarningsPanel warnings={result.warnings} />}
      </div>
    </div>
  );
}
