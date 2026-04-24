import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [25, 50, 100, 250, 0]; // 0 = Todos

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : pageSize === 0 ? 1 : (page - 1) * pageSize + 1;
  const end = pageSize === 0 ? total : Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <span>Mostrar</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s === 0 ? 'Todos' : s}
            </option>
          ))}
        </select>
        <span>registros</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="mr-3">
          {total === 0 ? '0' : `${start}-${end}`} de {total}
        </span>
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page number buttons */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
              acc.push('...');
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  page === p
                    ? 'bg-green-600 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
