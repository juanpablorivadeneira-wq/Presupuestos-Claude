import { useState, useRef } from 'react';

export function useResizableColumns<T extends Record<string, number>>(initial: T) {
  const [widths, setWidths] = useState<T>(initial);
  const resizing = useRef<{ col: keyof T; startX: number; startW: number } | null>(null);

  function onMouseDown(col: keyof T, e: React.MouseEvent) {
    e.preventDefault();
    resizing.current = { col, startX: e.clientX, startW: widths[col] };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const w = Math.max(48, resizing.current.startW + ev.clientX - resizing.current.startX);
      setWidths((p) => ({ ...p, [resizing.current!.col]: w }));
    };
    const onUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function resizer(col: keyof T) {
    return (
      <div
        onMouseDown={(e) => onMouseDown(col, e)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/60 transition-colors"
      />
    );
  }

  return { widths, resizer };
}
