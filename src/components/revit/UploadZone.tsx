import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import type { AnalysisResponse } from './types';

interface Props {
  onResult: (r: AnalysisResponse) => void;
}

const API_BASE = import.meta.env.VITE_REVIT_API_URL ?? 'http://localhost:8001';

export default function UploadZone({ onResult }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('El archivo debe tener extensión .csv');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máx 10 MB)');
      return;
    }

    setError('');
    setLoading(true);
    setProgress(`Analizando "${file.name}"...`);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_BASE}/api/revit/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Error ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();
      setProgress(`Detectadas ${data.total_sections} secciones — procesando...`);
      await new Promise((r) => setTimeout(r, 300));
      onResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    []
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold text-[#1F4E78] mb-2 text-center">
          Análisis de Cantidades Revit
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Sube el CSV exportado desde Revit para obtener el resumen de cantidades de obra
        </p>

        <label
          htmlFor="csv-upload"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all ${
            dragging
              ? 'border-[#1F4E78] bg-blue-50'
              : 'border-gray-300 bg-white hover:border-[#2E75B6] hover:bg-blue-50/40'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-12 h-12 text-[#1F4E78] animate-spin mb-4" />
              <p className="text-sm text-gray-600">{progress}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                {dragging ? (
                  <FileText className="w-8 h-8 text-[#1F4E78]" />
                ) : (
                  <Upload className="w-8 h-8 text-[#1F4E78]" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu CSV aquí o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-gray-400">Solo archivos .csv · máx 10 MB</p>
            </>
          )}
        </label>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileInput}
          disabled={loading}
        />

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
