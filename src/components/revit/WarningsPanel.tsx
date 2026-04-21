import { AlertTriangle, Info, XCircle } from 'lucide-react';
import type { WarningItem } from './types';

interface Props {
  warnings: WarningItem[];
}

const levelConfig = {
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
};

export default function WarningsPanel({ warnings }: Props) {
  if (warnings.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700 text-sm font-medium">
        Sin advertencias — datos consistentes
      </div>
    );
  }

  const byLevel = {
    error: warnings.filter((w) => w.level === 'error'),
    warning: warnings.filter((w) => w.level === 'warning'),
    info: warnings.filter((w) => w.level === 'info'),
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        {byLevel.error.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
            {byLevel.error.length} errores
          </span>
        )}
        {byLevel.warning.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
            {byLevel.warning.length} advertencias
          </span>
        )}
        {byLevel.info.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
            {byLevel.info.length} informativos
          </span>
        )}
      </div>

      {(['error', 'warning', 'info'] as const).map((level) =>
        byLevel[level].map((w, i) => {
          const cfg = levelConfig[level];
          const Icon = cfg.icon;
          return (
            <div key={`${level}-${i}`} className={`${cfg.bg} ${cfg.border} border rounded-xl p-4 flex gap-3`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                    {w.code}
                  </span>
                  {w.section_code && (
                    <span className="text-xs font-mono text-gray-500">{w.section_code}</span>
                  )}
                </div>
                <p className={`text-sm ${cfg.text}`}>{w.message}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
