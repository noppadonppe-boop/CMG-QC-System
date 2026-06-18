import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Lock, RefreshCcw } from 'lucide-react';

function readStorageArray(storageKey, fallback = []) {
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

function readStorageObject(storageKey, fallback = {}) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function mergeOrderWithColumns(columns, storedOrder) {
  const columnKeys = columns.map(col => col.key);
  const known = storedOrder.filter(key => columnKeys.includes(key));
  const missing = columnKeys.filter(key => !known.includes(key));
  return [...known, ...missing];
}

export function useColumnVisibility(storageKey, columns) {
  const orderKey = `${storageKey}:order`;
  const widthKey = `${storageKey}:width`;
  const lockedKeys = useMemo(() => columns.filter(col => col.locked).map(col => col.key), [columns]);
  const defaultHidden = useMemo(() => columns.filter(col => col.defaultHidden).map(col => col.key), [columns]);

  const [hiddenKeys, setHiddenKeys] = useState(() => {
    const stored = readStorageArray(storageKey, defaultHidden);
    return stored.filter(key => columns.some(col => col.key === key && !col.locked));
  });
  const [orderedKeys, setOrderedKeys] = useState(() => {
    const stored = readStorageArray(orderKey, columns.map(col => col.key));
    return mergeOrderWithColumns(columns, stored);
  });
  const [columnWidths, setColumnWidths] = useState(() => readStorageObject(widthKey, {}));

  useEffect(() => {
    setHiddenKeys(prev => prev.filter(key => columns.some(col => col.key === key && !col.locked)));
    setOrderedKeys(prev => mergeOrderWithColumns(columns, prev));
  }, [columns]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(hiddenKeys));
  }, [hiddenKeys, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(orderKey, JSON.stringify(orderedKeys));
  }, [orderedKeys, orderKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(widthKey, JSON.stringify(columnWidths));
  }, [columnWidths, widthKey]);

  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys]);
  const orderedColumns = useMemo(() => {
    const byKey = new Map(columns.map(col => [col.key, col]));
    return orderedKeys.map(key => byKey.get(key)).filter(Boolean);
  }, [columns, orderedKeys]);
  const visibleColumns = useMemo(
    () => orderedColumns.filter(col => !hiddenSet.has(col.key)),
    [orderedColumns, hiddenSet],
  );

  const totalCount = columns.length;
  const visibleCount = visibleColumns.length;

  function toggle(key) {
    if (lockedKeys.includes(key)) return;
    setHiddenKeys(prev => (
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    ));
  }

  function moveColumn(fromKey, toKey) {
    if (!fromKey || !toKey || fromKey === toKey) return;
    setOrderedKeys(prev => {
      const fromIndex = prev.indexOf(fromKey);
      const toIndex = prev.indexOf(toKey);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function reset() {
    setHiddenKeys(defaultHidden.filter(key => !lockedKeys.includes(key)));
    setOrderedKeys(columns.map(col => col.key));
    setColumnWidths({});
  }

  function setColumnWidth(key, width) {
    setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, width) }));
  }

  return {
    columns,
    orderedKeys,
    orderedColumns,
    visibleColumns,
    hiddenSet,
    visibleCount,
    totalCount,
    toggle,
    moveColumn,
    reset,
    columnWidths,
    setColumnWidth,
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
  const [draggingKey, setDraggingKey] = useState('');
  const { columns: allColumns, orderedKeys, orderedColumns, visibleColumns, hiddenSet, visibleCount, totalCount, toggle, moveColumn, reset, columnWidths, setColumnWidth } =
    useColumnVisibility(storageKey, columns);

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

  function onDropColumn(targetKey) {
    if (!draggingKey) return;
    moveColumn(draggingKey, targetKey);
    setDraggingKey('');
  }

  useEffect(() => {
    const table = document.querySelector(`table[data-column-table="${tableId}"]`);
    if (!table) return;

    const originalIndexByKey = new Map(allColumns.map((col, idx) => [col.key, idx]));
    const rows = table.querySelectorAll('tr');

    rows.forEach((row) => {
      const cells = Array.from(row.children);
      if (cells.length !== allColumns.length) return;

      orderedKeys.forEach((key) => {
        const originalIndex = originalIndexByKey.get(key);
        const cell = cells[originalIndex];
        if (!cell) return;
        cell.style.display = hiddenSet.has(key) ? 'none' : '';
        row.appendChild(cell);
      });
    });
  }, [allColumns, orderedKeys, hiddenSet, tableId]);

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
                <div className="text-[11px] text-slate-500">ติ๊กเพื่อแสดง/ซ่อน และลากเพื่อเรียงคอลัมน์</div>
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
              {orderedColumns.map(col => {
                const checked = !hiddenSet.has(col.key);
                const locked = !!col.locked;
                const dragging = draggingKey === col.key;
                return (
                  <div
                    key={col.key}
                    draggable={!locked}
                    onDragStart={() => !locked && setDraggingKey(col.key)}
                    onDragEnd={() => setDraggingKey('')}
                    onDragOver={(e) => {
                      if (!locked) e.preventDefault();
                    }}
                    onDrop={() => !locked && onDropColumn(col.key)}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      locked ? 'cursor-not-allowed opacity-60' : 'cursor-grab hover:bg-slate-50'
                    } ${dragging ? 'opacity-40' : ''}`}
                  >
                    <GripVertical size={13} className={locked ? 'text-slate-300' : 'text-slate-400'} />
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className={className}>
        {typeof children === 'function' ? children({ visibleColumns, orderedColumns, tableId, columnWidths, setColumnWidth }) : children}
      </div>
    </div>
  );
}
