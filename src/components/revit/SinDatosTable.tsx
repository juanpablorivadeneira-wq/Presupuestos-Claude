import type { SectionSummary } from './types';

interface Props {
  summaries: SectionSummary[];
}

const OBS = 'Tabla presente en Revit pero sin elementos modelados. Requiere revisión: modelado pendiente o rubro no aplica.';

export default function SinDatosTable({ summaries }: Props) {
  const empty = summaries.filter((s) => !s.has_data);

  // Group by chapter
  const byChapter = new Map<string, SectionSummary[]>();
  for (const s of empty) {
    if (!byChapter.has(s.chapter_code)) byChapter.set(s.chapter_code, []);
    byChapter.get(s.chapter_code)!.push(s);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-[#C00000]">
        <h3 className="text-sm font-semibold text-white">
          Rubros sin datos en Revit — {empty.length} secciones
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              {['Código', 'Descripción', 'Capítulo', 'Observación'].map((h) => (
                <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...byChapter.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, sections]) => (
              <>
                <tr key={sections[0].chapter_code} className="bg-[#2E75B6]/10">
                  <td colSpan={4} className="px-3 py-1.5 text-xs font-bold text-[#1F4E78] uppercase tracking-wider">
                    {sections[0].chapter_code} — {sections[0].chapter_name}
                  </td>
                </tr>
                {sections.map((s, i) => (
                  <tr key={s.code} className={`border-b border-gray-100 hover:bg-red-50/20 ${i % 2 === 0 ? 'bg-[#FCE4D6]/20' : ''}`}>
                    <td className="px-3 py-2 font-mono text-sm font-semibold text-[#C00000]">{s.code}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{s.description}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{s.chapter_code} – {s.chapter_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-[320px]">{OBS}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
