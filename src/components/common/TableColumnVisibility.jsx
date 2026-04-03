import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Lock, RefreshCcw } from 'lucide-react';

function readHiddenKeys(storageKey, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function useColumnVisibility(storageKey, columns) {
  const lockedKeys = useMemo(() => columns.filter(col => col.locked).map(col => col.key), [columns]);
  const defaultHidden = useMemo(() => columns.filter(col => col.defaultHidden).map(col => col.key), [columns]);
  const [hiddenKeys, setHiddenKeys] = useState(() => {
    const stored = readHiddenKeys(storageKey, defaultHidden);
    return stored.filter(key => columns.some(col => col.key === key && !col.locked));
  });

  useEffect(() => {
    setHiddenKeys(prev => prev.filter(key => columns.some(col => col.key === key && !col.locked)));
  }, [columns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(hiddenKeys));
  }, [hiddenKeys, storageKey]);

  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);
  const visibleColumns = useMemo(
    () => columns.filter(col => !hiddenSet.has(col.key)),
    [columns, hiddenSet],
  );

  const totalCount = columns.length;
  const visibleCount = visibleColumns.length;

  function toggle(key) {
    if (lockedKeys.includes(key)) return;
    setHiddenKeys(prev => (
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    ));
  }

  function reset() {
    setHiddenKeys(defaultHidden.filter(key => !lockedKeys.includes(key)));
  }

  return {
    columns,
    hiddenSet,
    visibleColumns,
    visibleCount,
    totalCount,
    toggle,
    reset,
  };
}

export default function TableColumnVisibility({
  storageKey,
  columns,
  tableId,
  children,
  className = '',
}) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { hiddenSet, visibleCount, totalCount, toggle, reset } = useColumnVisibility(storageKey, columns);

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const hiddenIndices = columns
    .map((col, idx) => (hiddenSet.has(col.key) ? idx + 1 : null))
    .filter(Boolean);

  const columnCss = hiddenIndices.length
    ? hiddenIndices
        .map(idx => `
          table[data-column-table="${tableId}"] tr > *:nth-child(${idx}) {
            display: none !important;
          }
        `)
        .join('\n')
    : '';

  return (
    <div className="relative">
      <div className="relative mb-3 flex items-center justify-end" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm hover:bg-orange-100"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-md border border-orange-300">
            <span className="text-[10px] leading-none">||</span>
          </span>
          คอลัมน์
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold">{visibleCount}/{totalCount}</span>
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">แสดง/ซ่อน คอลัมน์</div>
                <div className="text-[11px] text-slate-500">เลือกคอลัมน์ที่ต้องการแสดงในตารางนี้</div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-orange-600 hover:bg-orange-50"
              >
                <RefreshCcw size={11} /> รีเซ็ต
              </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {columns.map(col => {
                const checked = !hiddenSet.has(col.key);
                const locked = !!col.locked;
                return (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggle(col.key)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className={`flex-1 text-[13px] font-medium ${checked ? 'text-slate-700' : 'text-slate-400'}`}>
                      {col.label}
                    </span>
                    {locked && <Lock size={12} className="text-slate-300" />}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <style>{columnCss}</style>
      <div className={className}>
        {children}
      </div>
    </div>
  );
}
