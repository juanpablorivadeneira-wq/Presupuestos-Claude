import React, { useEffect, useRef, useState } from 'react';
import { X, GripHorizontal } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  flush?: boolean;
  draggable?: boolean;
  resizable?: boolean;
}

export default function Modal({ title, onClose, children, size = 'md', flush = false, draggable = false, resizable = false }: ModalProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [customSize, setCustomSize] = useState<{ w: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function onDragStart(e: React.MouseEvent) {
    if (!draggable) return;
    e.preventDefault();
    const startX = e.clientX - offset.x;
    const startY = e.clientY - offset.y;
    const onMove = (e: MouseEvent) => {
      setOffset({ x: e.clientX - startX, y: e.clientY - startY });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function onResizeStart(e: React.MouseEvent) {
    if (!resizable) return;
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;
    const onMove = (e: MouseEvent) => {
      setCustomSize({
        w: Math.max(320, startW + e.clientX - startX),
        h: Math.max(240, startH + e.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  const containerStyle: React.CSSProperties = {
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    ...(customSize ? { width: customSize.w, height: customSize.h, maxWidth: 'none', maxHeight: 'none' } : {}),
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={containerRef}
        className={`absolute z-10 bg-white rounded-lg shadow-xl flex flex-col top-1/2 left-1/2 ${!customSize ? `w-full ${sizeClass} mx-4 max-h-[90vh]` : ''}`}
        style={containerStyle}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 ${draggable ? 'cursor-move select-none' : ''}`}
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-2">
            {draggable && <GripHorizontal size={14} className="text-gray-300" />}
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={flush ? 'flex-1 overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto flex-1 px-6 py-4'}>
          {children}
        </div>

        {/* Resize handle */}
        {resizable && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={onResizeStart}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #d1d5db 50%)',
              borderBottomRightRadius: 8,
            }}
          />
        )}
      </div>
    </div>
  );
}
