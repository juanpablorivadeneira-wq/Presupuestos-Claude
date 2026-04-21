import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import type { SectionSummary } from './types';

interface Props {
  summaries: SectionSummary[];
}

type SortKey = 'code' | 'chapter_code' | 'quantity' | 'unit' | 'element_count';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-white" />
    : <ChevronDown className="w-3 h-3 text-white" />;
}

export default function ResumenTable({ summaries }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterChapter, setFilterChapter] = useState('');
  const [search, setSearch] = useState('');

  const chapters = useMemo(() => {
    const unique = new Map<string, string>();
    summaries.forEach((s) => unique.set(s.chapter_code, s.chapter_name));
    return [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [summaries]);

  const data = summaries.filter((s) => s.has_data);

  const filtered = useMemo(() => {
    let rows = data;
    if (filterChapter) rows = rows.filter((s) => s.chapter_code === filterChapter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.description.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, filterChapter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function Th({ label, sk }: { label: string; sk: SortKey }) {
    return (
      <th
        onClick={() => toggleSort(sk)}
        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:bg-[#2E75B6]"
      >
        <span className="flex items-center gap-1">
          {label}
          <SortIcon active={sortKey === sk} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar descripción o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1F4E78] w-64"
          />
        </div>
        <select
          value={filterChapter}
          onChange={(e) => setFilterChapter(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1F4E78]"
        >
          <option value="">Todos los capítulos</option>
          {chapters.map(([code, name]) => (
            <option key={code} value={code}>{code} – {name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 self-center">{filtered.length} rubros</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1F4E78] text-white sticky top-0">
              <tr>
                <Th label="Capítulo" sk="chapter_code" />
                <Th label="Código" sk="code" />
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Descripción</th>
                <Th label="Cantidad" sk="quantity" />
                <Th label="Unidad" sk="unit" />
                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Fuente</th>
                <Th label="Elementos" sk="element_count" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.code} className={`border-b border-gray-100 hover:bg-blue-50/30 ${i % 2 === 1 ? 'bg-blue-50/10' : ''}`}>
                  <td className="px-3 py-2 text-xs text-gray-500">{s.chapter_code} – {s.chapter_name}</td>
                  <td className="px-3 py-2 font-mono text-sm font-semibold text-[#1F4E78]">{s.code}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 max-w-[280px]">{s.description}</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold">
                    {s.quantity != null
                      ? s.quantity.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{s.unit || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.fuente === 'Grand Total (Revit)' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.fuente === 'Grand Total (Revit)' ? 'Grand Total' : 'Calculado'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm text-gray-500">{s.element_count}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    No hay rubros que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
