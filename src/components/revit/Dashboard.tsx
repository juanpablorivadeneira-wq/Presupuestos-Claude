import type { AnalysisResponse, ChapterStats, TopSection } from './types';

interface Props {
  data: AnalysisResponse;
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1 shadow-sm">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ChapterRow({ code, stats }: { code: string; stats: ChapterStats }) {
  const pct = stats.pct;
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 font-mono text-sm font-semibold text-[#1F4E78]">{code}</td>
      <td className="px-3 py-2 text-sm text-gray-700">{stats.name}</td>
      <td className="px-3 py-2 text-center text-sm text-green-700 font-medium">{stats.with_data}</td>
      <td className="px-3 py-2 text-center text-sm text-red-600">{stats.without_data}</td>
      <td className="px-3 py-2 text-center text-sm">{stats.total}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold w-10 text-right">{pct.toFixed(1)}%</span>
        </div>
      </td>
    </tr>
  );
}

function TopAreaRow({ rank, item }: { rank: number; item: TopSection }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/30">
      <td className="px-3 py-2 text-center text-sm font-bold text-gray-400">{rank}</td>
      <td className="px-3 py-2 font-mono text-sm font-semibold text-[#1F4E78]">{item.code}</td>
      <td className="px-3 py-2 text-sm text-gray-700 max-w-[260px] truncate">{item.description}</td>
      <td className="px-3 py-2 text-right text-sm font-semibold text-[#1F4E78]">
        {item.quantity.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span className="text-xs text-gray-400 ml-1">m²</span>
      </td>
    </tr>
  );
}

export default function Dashboard({ data }: Props) {
  const pctColor = data.pct_modeled >= 80 ? 'text-green-600' : data.pct_modeled >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Rubros totales" value={data.total_sections} color="text-[#1F4E78]" />
        <KpiCard label="Con datos" value={data.with_data} color="text-green-700" />
        <KpiCard label="Sin datos" value={data.without_data} color="text-red-600" />
        <KpiCard label="% Modelado" value={`${data.pct_modeled.toFixed(1)}%`} color={pctColor} />
      </div>

      {/* Totals by unit */}
      {Object.keys(data.totals_by_unit).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Totales agregados</h3>
          <div className="flex flex-wrap gap-6">
            {Object.entries(data.totals_by_unit).map(([unit, total]) => (
              <div key={unit} className="flex flex-col">
                <span className="text-xs text-gray-400">{unit}</span>
                <span className="text-xl font-bold text-[#1F4E78]">
                  {total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chapter completeness */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#1F4E78]">
            <h3 className="text-sm font-semibold text-white">Completitud por Capítulo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  {['Cap.', 'Nombre', 'Con datos', 'Sin datos', 'Total', '% Modelado'].map((h) => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.chapter_stats).map(([code, stats]) => (
                  <ChapterRow key={code} code={code} stats={stats} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 by area */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#1F4E78]">
            <h3 className="text-sm font-semibold text-white">Top 10 Rubros por Área (m²)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Código', 'Descripción', 'Área (m²)'].map((h) => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_area.map((item, i) => (
                  <TopAreaRow key={item.code} rank={i + 1} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
