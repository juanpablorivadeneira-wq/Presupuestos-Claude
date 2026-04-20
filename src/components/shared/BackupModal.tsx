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

type Step = 'main' | 'export-select' | 'import-select';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

interface SectionHeaderProps {
  label: string; count: number; total: number; expanded: boolean;
  onToggle: () => void; onSelectAll: () => void; onClearAll: () => void;
}
function SectionHeader({ label, count, total, expanded, onToggle, onSelectAll, onClearAll }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0 z-10">
      <button onClick={onToggle} className="flex items-center gap-1.5 flex-1 text-left">
        {expanded
          ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-400 ml-1">({count}/{total})</span>
      </button>
      <button onClick={onSelectAll} className="text-xs text-blue-600 hover:underline">todos</button>
      <span className="text-gray-300">·</span>
      <button onClick={onClearAll} className="text-xs text-gray-500 hover:underline">ninguno</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BackupModal({ onClose }: BackupModalProps) {
  const { importBackup, mergeBackup, databases, budgets, budgetUpdates } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('main');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Export state ────────────────────────────────────────────────────────────
  const [expDbs, setExpDbs] = useState<Set<string>>(new Set(databases.map((d) => d.id)));
  const [expBudgets, setExpBudgets] = useState<Set<string>>(new Set(budgets.map((b) => b.id)));
  const [expUpdates, setExpUpdates] = useState<Set<string>>(new Set(budgetUpdates.map((u) => u.id)));
  const [expSections, setExpSections] = useState({ databases: true, budgets: true, updates: true });

  // ── Import state ────────────────────────────────────────────────────────────
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [impDbs, setImpDbs] = useState<Set<string>>(new Set());
  const [impBudgets, setImpBudgets] = useState<Set<string>>(new Set());
  const [impUpdates, setImpUpdates] = useState<Set<string>>(new Set());
  const [impSections, setImpSections] = useState({ databases: true, budgets: true, updates: true });
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  // ── Export actions ──────────────────────────────────────────────────────────

  function handleDownload() {
    const data = {
      databases: databases.filter((d) => expDbs.has(d.id)),
      budgets: budgets.filter((b) => expBudgets.has(b.id)),
      budgetUpdates: budgetUpdates.filter((u) => expUpdates.has(u.id)),
      currentDatabaseId: null,
      currentBudgetId: null,
      currentBudgetUpdateId: null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildkontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', message: 'Backup descargado correctamente.' });
    setStep('main');
  }

  // ── Import actions ──────────────────────────────────────────────────────────

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
        setImpDbs(new Set((data.databases as Database[]).map((d) => d.id)));
        setImpBudgets(new Set((data.budgets as Budget[]).map((b) => b.id)));
        setImpUpdates(new Set((data.budgetUpdates as BudgetUpdate[]).map((u) => u.id)));
        setStatus(null);
        setStep('import-select');
      } catch {
        setStatus({ type: 'error', message: 'No se pudo leer el archivo.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleConfirmRestore() {
    if (!parsed) return;
    const dbs = parsed.databases.filter((d) => impDbs.has(d.id));
    const bgs = parsed.budgets.filter((b) => impBudgets.has(b.id));
    const bus = parsed.budgetUpdates.filter((u) => impUpdates.has(u.id));
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

  // ── Render: export selection ─────────────────────────────────────────────

  if (step === 'export-select') {
    const anyExp = expDbs.size > 0 || expBudgets.size > 0 || expUpdates.size > 0;
    return (
      <Modal title="Seleccionar elementos para el backup" onClose={onClose} size="lg">
        <div className="space-y-4">

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">

            <SectionHeader
              label="Bases de Datos" count={expDbs.size} total={databases.length}
              expanded={expSections.databases} onToggle={() => setExpSections((s) => ({ ...s, databases: !s.databases }))}
              onSelectAll={() => setExpDbs(new Set(databases.map((d) => d.id)))}
              onClearAll={() => setExpDbs(new Set())}
            />
            {expSections.databases && databases.map((db) => (
              <label key={db.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={expDbs.has(db.id)} onChange={() => setExpDbs(toggle(expDbs, db.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{db.name}</p>
                  <p className="text-xs text-gray-400">{db.items.length} items · {db.rubros.length} rubros</p>
                </div>
              </label>
            ))}
            {expSections.databases && databases.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin bases de datos</p>
            )}

            <SectionHeader
              label="Presupuestos" count={expBudgets.size} total={budgets.length}
              expanded={expSections.budgets} onToggle={() => setExpSections((s) => ({ ...s, budgets: !s.budgets }))}
              onSelectAll={() => setExpBudgets(new Set(budgets.map((b) => b.id)))}
              onClearAll={() => setExpBudgets(new Set())}
            />
            {expSections.budgets && budgets.map((b) => (
              <label key={b.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={expBudgets.has(b.id)} onChange={() => setExpBudgets(toggle(expBudgets, b.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.lineItems.length} rubros</p>
                </div>
              </label>
            ))}
            {expSections.budgets && budgets.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin presupuestos</p>
            )}

            <SectionHeader
              label="Actualizaciones" count={expUpdates.size} total={budgetUpdates.length}
              expanded={expSections.updates} onToggle={() => setExpSections((s) => ({ ...s, updates: !s.updates }))}
              onSelectAll={() => setExpUpdates(new Set(budgetUpdates.map((u) => u.id)))}
              onClearAll={() => setExpUpdates(new Set())}
            />
            {expSections.updates && budgetUpdates.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={expUpdates.has(u.id)} onChange={() => setExpUpdates(toggle(expUpdates, u.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.lineItems.length} rubros</p>
                </div>
              </label>
            ))}
            {expSections.updates && budgetUpdates.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin actualizaciones</p>
            )}

          </div>

          <p className="text-xs text-gray-500">
            Se incluirán: <strong>{expDbs.size} bases de datos</strong>, <strong>{expBudgets.size} presupuestos</strong>, <strong>{expUpdates.size} actualizaciones</strong>
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setStep('main')} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={!anyExp}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1e2d45] text-white rounded-md hover:bg-[#162236] disabled:opacity-50"
            >
              <Download size={15} />
              Descargar backup
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Render: import selection ─────────────────────────────────────────────

  if (step === 'import-select' && parsed) {
    const anyImp = impDbs.size > 0 || impBudgets.size > 0 || impUpdates.size > 0;
    return (
      <Modal title="Seleccionar elementos a restaurar" onClose={onClose} size="lg">
        <div className="space-y-4">

          <div className="flex gap-3">
            <label className={`flex-1 flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${restoreMode === 'merge' ? 'border-[#1e2d45] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" value="merge" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Fusionar</p>
                <p className="text-xs text-gray-500">Agrega los seleccionados a los existentes. Si el ID ya existe, lo reemplaza.</p>
              </div>
            </label>
            <label className={`flex-1 flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${restoreMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" value="replace" checked={restoreMode === 'replace'} onChange={() => setRestoreMode('replace')} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Reemplazar todo</p>
                <p className="text-xs text-gray-500">Elimina todos los datos actuales y carga solo los seleccionados.</p>
              </div>
            </label>
          </div>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">

            <SectionHeader
              label="Bases de Datos" count={impDbs.size} total={parsed.databases.length}
              expanded={impSections.databases} onToggle={() => setImpSections((s) => ({ ...s, databases: !s.databases }))}
              onSelectAll={() => setImpDbs(new Set(parsed.databases.map((d) => d.id)))}
              onClearAll={() => setImpDbs(new Set())}
            />
            {impSections.databases && parsed.databases.map((db) => (
              <label key={db.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={impDbs.has(db.id)} onChange={() => setImpDbs(toggle(impDbs, db.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{db.name}</p>
                  <p className="text-xs text-gray-400">{db.items.length} items · {db.rubros.length} rubros</p>
                </div>
                {databases.some((d) => d.id === db.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {impSections.databases && parsed.databases.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin bases de datos en el backup</p>
            )}

            <SectionHeader
              label="Presupuestos" count={impBudgets.size} total={parsed.budgets.length}
              expanded={impSections.budgets} onToggle={() => setImpSections((s) => ({ ...s, budgets: !s.budgets }))}
              onSelectAll={() => setImpBudgets(new Set(parsed.budgets.map((b) => b.id)))}
              onClearAll={() => setImpBudgets(new Set())}
            />
            {impSections.budgets && parsed.budgets.map((b) => (
              <label key={b.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={impBudgets.has(b.id)} onChange={() => setImpBudgets(toggle(impBudgets, b.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.lineItems.length} rubros</p>
                </div>
                {budgets.some((x) => x.id === b.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {impSections.budgets && parsed.budgets.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin presupuestos en el backup</p>
            )}

            <SectionHeader
              label="Actualizaciones" count={impUpdates.size} total={parsed.budgetUpdates.length}
              expanded={impSections.updates} onToggle={() => setImpSections((s) => ({ ...s, updates: !s.updates }))}
              onSelectAll={() => setImpUpdates(new Set(parsed.budgetUpdates.map((u) => u.id)))}
              onClearAll={() => setImpUpdates(new Set())}
            />
            {impSections.updates && parsed.budgetUpdates.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={impUpdates.has(u.id)} onChange={() => setImpUpdates(toggle(impUpdates, u.id))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.lineItems.length} rubros</p>
                </div>
                {budgetUpdates.some((x) => x.id === u.id) && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">existe</span>
                )}
              </label>
            ))}
            {impSections.updates && parsed.budgetUpdates.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Sin actualizaciones en el backup</p>
            )}

          </div>

          <p className="text-xs text-gray-500">
            Seleccionados: <strong>{impDbs.size} bases de datos</strong>, <strong>{impBudgets.size} presupuestos</strong>, <strong>{impUpdates.size} actualizaciones</strong>
          </p>

          {status?.type === 'error' && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-800">
              <AlertTriangle size={14} className="shrink-0" />{status.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setStep('main'); setParsed(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleConfirmRestore}
              disabled={!anyImp}
              className={`px-4 py-2 text-sm text-white rounded-md disabled:opacity-50 ${restoreMode === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e2d45] hover:bg-[#162236]'}`}
            >
              {restoreMode === 'replace' ? 'Reemplazar datos' : 'Fusionar datos'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Render: main ─────────────────────────────────────────────────────────

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
            Elige qué bases de datos, presupuestos y actualizaciones incluir en el archivo <code className="bg-gray-100 px-1 rounded">.json</code>.
          </p>
          <button
            onClick={() => setStep('export-select')}
            className="mt-1 flex items-center gap-2 px-4 py-2 text-sm bg-[#1e2d45] text-white rounded-md hover:bg-[#162236] transition-colors"
          >
            <Download size={15} />
            Crear backup…
          </button>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900">Restaurar backup</h3>
          <p className="text-xs text-amber-800">
            Selecciona un archivo de backup para elegir qué elementos restaurar.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-1 flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
          >
            <Upload size={15} />
            Seleccionar archivo…
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>

        {status && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {status.type === 'success'
              ? <CheckCircle size={14} className="shrink-0" />
              : <AlertTriangle size={14} className="shrink-0" />}
            {status.message}
          </div>
        )}

      </div>
    </Modal>
  );
}
