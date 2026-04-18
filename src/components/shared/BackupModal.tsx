import { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';
import { Database, Budget, BudgetUpdate } from '../../types';

interface BackupModalProps {
  onClose: () => void;
}

interface ParsedBackup {
  databases: Database[];
  budgets: Budget[];
  budgetUpdates: BudgetUpdate[];
}

type Step = 'main' | 'select';

export default function BackupModal({ onClose }: BackupModalProps) {
  const { exportBackup, importBackup, mergeBackup, databases, budgets, budgetUpdates } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('main');
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [selectedDbs, setSelectedDbs] = useState<Set<string>>(new Set());
  const [selectedBudgets, setSelectedBudgets] = useState<Set<string>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState({ databases: true, budgets: true, updates: true });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  function handleExport() { exportBackup(); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data.databases) || !Array.isArray(data.budgets) || !Array.isArray(data.budgetUpdates)) {
          setStatus({ type: 'error', message: 'Archivo inválido: estructura incorrecta.' });
          return;
        }
        setParsed(data as ParsedBackup);
        setSelectedDbs(new Set((data.databases as Database[]).map((d) => d.id)));
        setSelectedBudgets(new Set((data.budgets as Budget[]).map((b) => b.id)));
        setSelectedUpdates(new Set((data.budgetUpdates as BudgetUpdate[]).map((u) => u.id)));
        setStatus(null);
        setStep('select');
      } catch {
        setStatus({ type: 'error', message: 'No se pudo leer el archivo.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function toggleSection(key: keyof typeof expandedSections) {
    setExpandedSections((s) => ({ ...s, [key]: !s[key] }));
  }

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  function handleConfirmRestore() {
    if (!parsed) return;
    const dbs = parsed.databases.filter((d) => selectedDbs.has(d.id));
    const bgs = parsed.budgets.filter((b) => selectedBudgets.has(b.id));
    const bus = parsed.budgetUpdates.filter((u) => selectedUpdates.has(u.id));
    const total = dbs.length + bgs.length + bus.length;
    if (total === 0) {
      setStatus({ type: 'error', message: 'Selecciona al menos un elemento para restaurar.' });
      return;
    }

    if (restoreMode === 'replace') {
      importBackup(JSON.stringify({ databases: dbs, budgets: bgs, budgetUpdates: bus, currentDatabaseId: null, currentBudgetId: null, currentBudgetUpdateId: null }));
    } else {
      mergeBackup({ databases: dbs, budgets: bgs, budgetUpdates: bus });
    }

    setStatus({ type: 'success', message: `${total} elemento(s) restaurados correctamente.` });
    setStep('main');
    setParsed(null);
  }

  const anySelected = selectedDbs.size > 0 || selectedBudgets.size > 0 || selectedUpdates.size > 0;

  if (step === 'select' && parsed) {
    return (
      <Modal title="Seleccionar elementos a restaurar" onClose={onClose} size="lg">
        <div className="space-y-4">

          {/* Modo de restauración */}
          <div className="flex gap-3">
            <label className={`flex-1 flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${restoreMode === 'merge' ? 'border-[#1e2d45] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" value="merge" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Fusionar</p>
                <p className="text-xs text-gray-500">Agrega los elementos seleccionados a los existentes. Si el ID ya existe, lo reemplaza.</p>
              </div>
            </label>
            <label className={`flex-1 flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${restoreMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" value="replace" checked={restoreMode === 'replace'} onChange={() => setRestoreMode('replace')} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Reemplazar</p>
                <p className="text-xs text-gray-500">Elimina todos los datos actuales y carga solo los seleccionados.</p>
              </div>
            </label>
          </div>

          {/* Secciones */}
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">

            {/* Bases de datos */}
            <SectionHeader
              label="Bases de Datos"
              count={selectedDbs.size}
              total={parsed.databases.length}
              expanded={expandedSections.databases}
              onToggle={() => toggleSection('databases')}
              onSelectAll={() => setSelectedDbs(new Set(parsed.databases.map((d) => d.id)))}
              onClearAll={() => setSelectedDbs(new Set())}
            />
            {expandedSections.databases && parsed.databases.map((db) => (
              <label key={db.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedDbs.has(db.id)} onChange={() => setSelectedDbs(toggle(selectedDbs, db.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{db.name}</p>
                  <p className="text-xs text-gray-400">{db.items.length} items · {db.rubros.length} rubros</p>
                </div>
                {databases.some((d) => d.id === db.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {expandedSections.databases && parsed.databases.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin bases de datos en el backup</p>
            )}

            {/* Presupuestos */}
            <SectionHeader
              label="Presupuestos"
              count={selectedBudgets.size}
              total={parsed.budgets.length}
              expanded={expandedSections.budgets}
              onToggle={() => toggleSection('budgets')}
              onSelectAll={() => setSelectedBudgets(new Set(parsed.budgets.map((b) => b.id)))}
              onClearAll={() => setSelectedBudgets(new Set())}
            />
            {expandedSections.budgets && parsed.budgets.map((b) => (
              <label key={b.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedBudgets.has(b.id)} onChange={() => setSelectedBudgets(toggle(selectedBudgets, b.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.lineItems.length} rubros</p>
                </div>
                {budgets.some((x) => x.id === b.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {expandedSections.budgets && parsed.budgets.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin presupuestos en el backup</p>
            )}

            {/* Actualizaciones */}
            <SectionHeader
              label="Actualizaciones"
              count={selectedUpdates.size}
              total={parsed.budgetUpdates.length}
              expanded={expandedSections.updates}
              onToggle={() => toggleSection('updates')}
              onSelectAll={() => setSelectedUpdates(new Set(parsed.budgetUpdates.map((u) => u.id)))}
              onClearAll={() => setSelectedUpdates(new Set())}
            />
            {expandedSections.updates && parsed.budgetUpdates.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedUpdates.has(u.id)} onChange={() => setSelectedUpdates(toggle(selectedUpdates, u.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.lineItems.length} rubros</p>
                </div>
                {budgetUpdates.some((x) => x.id === u.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {expandedSections.updates && parsed.budgetUpdates.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin actualizaciones en el backup</p>
            )}

          </div>

          <p className="text-xs text-gray-500">
            Seleccionados: <strong>{selectedDbs.size} bases de datos</strong>, <strong>{selectedBudgets.size} presupuestos</strong>, <strong>{selectedUpdates.size} actualizaciones</strong>
          </p>

          {status && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${status.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              <AlertTriangle size={14} className="shrink-0" />
              {status.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setStep('main'); setParsed(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleConfirmRestore}
              disabled={!anySelected}
              className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${restoreMode === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e2d45] hover:bg-[#162236]'}`}
            >
              {restoreMode === 'replace' ? 'Reemplazar datos' : 'Fusionar datos'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Backup y Restauración" onClose={onClose} size="md">
      <div className="space-y-5">

        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 flex gap-6">
          <span><span className="font-semibold text-gray-800">{databases.length}</span> bases de datos</span>
          <span><span className="font-semibold text-gray-800">{budgets.length}</span> presupuestos</span>
          <span><span className="font-semibold text-gray-800">{budgetUpdates.length}</span> actualizaciones</span>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Exportar backup</h3>
          <p className="text-xs text-gray-500">
            Descarga un archivo <code className="bg-gray-100 px-1 rounded">.json</code> con todos tus datos.
          </p>
          <button onClick={handleExport} className="mt-1 flex items-center gap-2 px-4 py-2 text-sm bg-[#1e2d45] text-white rounded-md hover:bg-[#162236] transition-colors">
            <Download size={15} />
            Descargar backup
          </button>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900">Restaurar backup</h3>
          <p className="text-xs text-amber-800">
            Selecciona un archivo de backup para elegir qué elementos restaurar.
          </p>
          <button onClick={() => fileRef.current?.click()} className="mt-1 flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors">
            <Upload size={15} />
            Seleccionar archivo…
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {status.type === 'success' ? <CheckCircle size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
            {status.message}
          </div>
        )}

      </div>
    </Modal>
  );
}

interface SectionHeaderProps {
  label: string; count: number; total: number; expanded: boolean;
  onToggle: () => void; onSelectAll: () => void; onClearAll: () => void;
}
function SectionHeader({ label, count, total, expanded, onToggle, onSelectAll, onClearAll }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0">
      <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 text-left">
        {expanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-400">({count}/{total})</span>
      </button>
      <button onClick={onSelectAll} className="text-xs text-blue-600 hover:underline">todos</button>
      <span className="text-gray-300">·</span>
      <button onClick={onClearAll} className="text-xs text-gray-500 hover:underline">ninguno</button>
    </div>
  );
}
