import { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { useStore } from '../../store/useStore';

interface BackupModalProps {
  onClose: () => void;
}

export default function BackupModal({ onClose }: BackupModalProps) {
  const { exportBackup, importBackup, databases, budgets, budgetUpdates } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pendingJson, setPendingJson] = useState<string | null>(null);

  function handleExport() {
    exportBackup();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      setPendingJson(json);
      setConfirming(true);
      setStatus(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleConfirmRestore() {
    if (!pendingJson) return;
    const result = importBackup(pendingJson);
    setConfirming(false);
    setPendingJson(null);
    if (result.ok) {
      setStatus({ type: 'success', message: 'Backup restaurado correctamente.' });
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Error desconocido.' });
    }
  }

  return (
    <Modal title="Backup y Restauración" onClose={onClose} size="md">
      <div className="space-y-5">

        {/* Estado actual */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 flex gap-6">
          <span><span className="font-semibold text-gray-800">{databases.length}</span> bases de datos</span>
          <span><span className="font-semibold text-gray-800">{budgets.length}</span> presupuestos</span>
          <span><span className="font-semibold text-gray-800">{budgetUpdates.length}</span> actualizaciones</span>
        </div>

        {/* Exportar */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Exportar backup</h3>
          <p className="text-xs text-gray-500">
            Descarga un archivo <code className="bg-gray-100 px-1 rounded">.json</code> con todos tus datos.
            Guárdalo en un lugar seguro.
          </p>
          <button
            onClick={handleExport}
            className="mt-1 flex items-center gap-2 px-4 py-2 text-sm bg-[#1e2d45] text-white rounded-md hover:bg-[#162236] transition-colors"
          >
            <Download size={15} />
            Descargar backup
          </button>
        </div>

        {/* Restaurar */}
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900">Restaurar backup</h3>
          <p className="text-xs text-amber-800">
            <AlertTriangle size={12} className="inline mr-1" />
            Esto <strong>reemplazará todos los datos actuales</strong> con los del archivo seleccionado.
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

        {/* Confirmación restaurar */}
        {confirming && (
          <div className="border border-red-300 bg-red-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">¿Confirmas la restauración?</p>
            <p className="text-xs text-red-700">
              Se sobreescribirán todos los datos actuales. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirming(false); setPendingJson(null); }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Sí, restaurar
              </button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {status && (
          <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {status.type === 'success'
              ? <CheckCircle size={16} className="shrink-0 mt-0.5" />
              : <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            }
            {status.message}
          </div>
        )}

      </div>
    </Modal>
  );
}
