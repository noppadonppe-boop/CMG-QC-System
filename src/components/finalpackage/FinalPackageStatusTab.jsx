import { createElement, Fragment, useCallback, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  Database,
  Eye,
  FileCheck2,
  Grid3X3,
  Link2,
  ListChecks,
  MoveHorizontal,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import RfiDetailModal from '../rfi/RfiDetailModal';
import CiGroupModal from './CiGroupModal';
import {
  buildCiGroupId,
  buildCiRfiLinkId,
  buildCiRfiLinkMap,
  buildTagRfiGroups,
  CI_GROUP_RECORD_TYPE,
  getCiGroups,
  getCiRfiLinkKey,
  getCiRfiLinks,
  getNextCiCode,
  getRfiDisplayNo,
  getRfiDisplayStatus,
  getRfiRevision,
  getRfiShortNo,
  isRfiClosed,
} from './finalPackageData';

const STATUS_CONFIG = {
  completed: { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  'in-progress': { label: 'In Progress', className: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  attention: { label: 'Needs Attention', className: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  pending: { label: 'Pending', className: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const STATIC_MATRIX_WIDTH = 791;
const CI_COLUMN_WIDTH = 58;
const STATIC_MATRIX_HEADERS = [
  { label: 'Item / TAG ID', sticky: true },
  { label: 'Sub-system' },
  { label: 'Work Step' },
  { label: 'Description' },
  { label: 'Total' },
  { label: 'Done' },
  { label: 'Remain' },
];

function StatusBadge({ status, compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${config.className} ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function SummaryText({ value, strong = false, mono = false, className = '' }) {
  const text = value?.display ?? value ?? '—';
  return (
    <span
      className={`block truncate whitespace-nowrap leading-tight text-[10.5px] ${strong ? 'font-semibold text-slate-900' : 'text-slate-600'} ${mono ? 'font-mono' : ''} ${className}`}
      title={value?.title || String(text)}
    >
      {text}
    </span>
  );
}

function StepHeader({ number, icon, title, subtitle, action }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white">
          {createElement(icon, { size: 15 })}
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[8px] font-bold text-white">{number}</span>
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold text-slate-800">{title}</h3>
          <p className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyStep({ number, text }) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-400">{number}</span>
      <p className="mt-3 max-w-xs text-xs text-slate-400">{text}</p>
    </div>
  );
}

function getRfiDescription(rfi) {
  return rfi.descriptionOfInspection || rfi.detailInspection || rfi.typeOfInspection || '—';
}

function getAssignedCiCount(rfiId, ciGroups, linkMap) {
  return ciGroups.reduce(
    (count, ci) => count + (linkMap.has(getCiRfiLinkKey(rfiId, ci.id)) ? 1 : 0),
    0,
  );
}

function useDragScroll() {
  const ref = useRef(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const container = ref.current;
    if (!container) return;

    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;

    const handleMouseMove = (moveEvent) => {
      if (!isMouseDownRef.current) return;
      const x = moveEvent.pageX - container.offsetLeft;
      const walk = x - startXRef.current;
      if (Math.abs(walk) > 4) {
        if (!hasDraggedRef.current) {
          hasDraggedRef.current = true;
          setIsDragging(true);
        }
        container.scrollLeft = scrollLeftRef.current - walk;
      }
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleClickCapture = useCallback((e) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  }, []);

  return {
    ref,
    isDragging,
    onMouseDown: handleMouseDown,
    onClickCapture: handleClickCapture,
  };
}

function TagCiMatrix({
  groups,
  ciGroups,
  linkMap,
  expandedTagKeys,
  onToggleTag,
  allExpanded,
  onToggleAll,
  onViewRfi,
  fullHeight = false,
}) {
  const columnCount = 8 + ciGroups.length;
  const minWidth = STATIC_MATRIX_WIDTH + (ciGroups.length * CI_COLUMN_WIDTH);
  const { ref, isDragging, onMouseDown, onClickCapture } = useDragScroll();

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onClickCapture={onClickCapture}
      className={`${
        fullHeight ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[420px] overflow-auto'
      } ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
    >
      <table className="w-full table-fixed text-[10.5px]" style={{ minWidth }}>
        <colgroup>
          <col style={{ width: 36 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 115 }} />
          <col style={{ width: 115 }} />
          <col style={{ width: 210 }} />
          <col style={{ width: 55 }} />
          <col style={{ width: 55 }} />
          <col style={{ width: 55 }} />
          {ciGroups.map(ci => <col key={ci.id} style={{ width: CI_COLUMN_WIDTH }} />)}
        </colgroup>
        <thead className="sticky top-0 z-20 text-white shadow-sm select-none">
          <tr>
            <th className="sticky left-0 z-40 bg-slate-800 px-1 py-1.5 text-center" style={{ width: 36 }} aria-label="Toggle all">
              <button
                type="button"
                onClick={onToggleAll}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-300 hover:bg-slate-700 hover:text-white"
                title={allExpanded ? 'Collapse All' : 'Expand All'}
              >
                <ChevronsUpDown size={12} />
              </button>
            </th>
            {STATIC_MATRIX_HEADERS.map(header => (
              <th
                key={header.label}
                className={`border-l border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[10px] font-semibold tracking-wide ${header.sticky ? 'sticky left-[36px] z-40 shadow-[2px_0_0_#334155]' : ''}`}
              >
                {header.label}
              </th>
            ))}
            {ciGroups.map(ci => (
              <th
                key={ci.id}
                className="border-l border-orange-500 bg-orange-600 px-0.5 py-0.5 text-center align-top"
                title={`${ci.code} — ${ci.title}`}
              >
                <span className="block font-mono text-[9.5px] font-bold leading-tight tracking-tight">{ci.code}</span>
                <span className="block truncate text-[7.5px] font-normal leading-tight text-orange-100" title={ci.title}>{ci.title}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="bg-white px-6 py-14 text-center text-xs text-slate-400">
                ไม่พบ TAG ID จากข้อมูล RFI ที่ตรงกับตัวกรอง
              </td>
            </tr>
          )}
          {groups.map(group => {
            const isExpanded = expandedTagKeys.has(group.key);
            const completeCount = group.rfis.filter(isRfiClosed).length;
            return (
              <Fragment key={group.key}>
                {/* Parent TAG Row */}
                <tr
                  onClick={() => onToggleTag(group.key)}
                  className={`cursor-pointer border-t select-none transition-colors ${
                    isExpanded
                      ? 'bg-amber-50/90 hover:bg-amber-100/90 border-t-2 border-orange-400 font-semibold'
                      : 'bg-slate-100/80 hover:bg-orange-50/60 border-t border-slate-200 text-slate-800'
                  }`}
                >
                  <td className={`sticky left-0 z-10 px-1 py-1 text-center border-r border-slate-200/80 ${
                    isExpanded ? 'bg-amber-50' : 'bg-slate-100'
                  }`}>
                    <button
                      type="button"
                      onClick={event => { event.stopPropagation(); onToggleTag(group.key); }}
                      aria-label={isExpanded ? `Collapse TAG ${group.tagId}` : `Expand TAG ${group.tagId}`}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded transition-all focus:outline-none focus:ring-1 focus:ring-orange-300 ${
                        isExpanded
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-white text-slate-500 border border-slate-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      <ChevronRight size={11} className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </td>
                  <td className={`sticky left-[36px] z-10 border-r border-slate-300 px-2 py-1 shadow-[2px_0_0_#cbd5e1] ${
                    isExpanded ? 'bg-amber-100 text-amber-950 font-bold' : 'bg-slate-200/90 text-slate-900 font-bold'
                  }`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono font-bold tracking-tight text-[11px]">{group.tagId}</span>
                      <span className={`shrink-0 rounded px-1 py-0 text-[8.5px] font-mono font-semibold ${
                        isExpanded ? 'bg-orange-200 text-orange-900' : 'bg-slate-300/80 text-slate-700'
                      }`}>
                        {group.rfis.length}
                      </span>
                    </div>
                  </td>
                  <td className="border-r border-slate-200/80 px-2 py-1 text-slate-300 text-center">—</td>
                  <td className="border-r border-slate-200/80 px-2 py-1 text-slate-300 text-center">—</td>
                  <td className="border-r border-slate-200/80 px-2 py-1 text-slate-300 text-center">—</td>
                  <td className="border-r border-slate-200/80 px-1 py-1 text-center font-mono font-bold text-slate-700">
                    {group.rfis.length}
                  </td>
                  <td className="border-r border-slate-200/80 px-1 py-1 text-center font-mono font-bold text-emerald-600">
                    {completeCount}
                  </td>
                  <td className="border-r border-slate-300 px-1 py-1 text-center font-mono font-bold text-amber-600">
                    {group.rfis.length - completeCount}
                  </td>
                  {ciGroups.map(ci => {
                    const assignedRfis = group.rfis.filter(rfi => linkMap.has(getCiRfiLinkKey(rfi.id, ci.id)));
                    return (
                      <td
                        key={ci.id}
                        className={`border-r border-slate-200/80 p-0 text-center align-middle ${
                          isExpanded ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {assignedRfis.length === 0 ? (
                          <span className="block text-center text-slate-300 text-[10px]">—</span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center font-mono text-[10px] font-bold text-slate-800"
                            title={`${assignedRfis.length} RFI(s) assigned: ${assignedRfis.map(r => `${getRfiShortNo(r)} (${getRfiDisplayNo(r)})`).join(', ')}`}
                          >
                            X
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Sub-rows for each RFI when expanded */}
                {isExpanded && group.rfis.map((rfi, idx) => {
                  const isClosed = isRfiClosed(rfi);
                  const rfiNo = getRfiDisplayNo(rfi);
                  const rfiShortNo = getRfiShortNo(rfi);
                  const rfiRev = getRfiRevision(rfi);
                  const rfiDesc = getRfiDescription(rfi);
                  const rfiWorkingStep = rfi.workingStep || rfi.workStep || group.workingStep?.all?.[0] || '—';
                  const rfiSubSystem = rfi.subSystem || rfi.structureType || group.subSystem?.all?.[0] || '—';
                  const isLastRfi = idx === group.rfis.length - 1;

                  return (
                    <tr
                      key={`${group.key}__rfi_${rfi.id || idx}`}
                      className={`bg-white hover:bg-sky-50/80 text-[10px] transition-colors ${
                        isLastRfi ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-white hover:bg-sky-50/80 px-1 py-0.5 text-center border-r border-slate-100 text-slate-400">
                        <span className="font-mono text-[11px] font-bold text-sky-500">↳</span>
                      </td>
                      <td className="sticky left-[36px] z-10 border-r border-slate-200 bg-sky-50/70 px-2 py-0.5 shadow-[2px_0_0_#e2e8f0]">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={event => { event.stopPropagation(); onViewRfi(rfi); }}
                            className="truncate font-mono font-semibold text-sky-700 hover:text-sky-900 hover:underline focus:outline-none text-[10.5px]"
                            title={`Click to view RFI ${rfiNo}`}
                          >
                            {rfiNo}
                          </button>
                          <span className="shrink-0 rounded bg-slate-200/70 px-1 py-0 text-[8.5px] font-mono text-slate-500">
                            r{rfiRev}
                          </span>
                        </div>
                      </td>
                      <td className="border-r border-slate-100 px-2 py-0.5 text-slate-500 truncate whitespace-nowrap" title={rfiSubSystem}>
                        {rfiSubSystem}
                      </td>
                      <td className="border-r border-slate-100 px-2 py-0.5 text-slate-500 truncate whitespace-nowrap" title={rfiWorkingStep}>
                        {rfiWorkingStep}
                      </td>
                      <td className="border-r border-slate-100 px-2 py-0.5 text-slate-500 truncate whitespace-nowrap" title={rfiDesc}>
                        {rfiDesc}
                      </td>
                      <td className="border-r border-slate-100 px-1 py-0.5 text-center font-mono text-slate-300 text-[9.5px]">
                        1
                      </td>
                      <td className="border-r border-slate-100 px-1 py-0.5 text-center font-mono text-[9.5px]">
                        {isClosed ? <span className="text-emerald-600 font-bold">1</span> : <span className="text-slate-200">0</span>}
                      </td>
                      <td className="border-r border-slate-200 px-1 py-0.5 text-center font-mono text-[9.5px]">
                        {isClosed ? <span className="text-slate-200">0</span> : <span className="text-amber-600 font-bold">1</span>}
                      </td>
                      {ciGroups.map(ci => {
                        const isLinked = linkMap.has(getCiRfiLinkKey(rfi.id, ci.id));
                        return (
                          <td
                            key={ci.id}
                            className={`border-r p-0 text-center align-middle ${
                              isLinked ? 'border-sky-200 bg-sky-50/80' : 'border-slate-100'
                            }`}
                          >
                            {isLinked ? (
                              <button
                                type="button"
                                onClick={event => { event.stopPropagation(); onViewRfi(rfi); }}
                                className="flex h-full min-h-[19px] w-full items-center justify-center border-y border-sky-300 bg-sky-100/90 px-0 py-0 text-center font-mono text-[8.5px] font-bold tracking-tight text-sky-800 transition-colors hover:bg-sky-200 hover:text-sky-900 focus:outline-none"
                                title={`View ${rfiNo} (CI: ${ci.code})`}
                              >
                                {rfiShortNo}
                              </button>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TagListPane({ groups, selectedTagKey, onSelect }) {
  return (
    <section className="flex min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-240px)] lg:min-h-[520px]">
      <StepHeader
        number="1"
        icon={Grid3X3}
        title="TAG List"
        subtitle={`${groups.length} TAG${groups.length === 1 ? '' : 's'} from RFI`}
      />
      <div className="max-h-[430px] flex-1 overflow-y-auto p-2 lg:max-h-none">
        {groups.length === 0 && <EmptyStep number="1" text="ไม่พบ TAG ID จากหน้า RFI" />}
        <div className="space-y-1.5">
          {groups.map(group => {
            const selected = group.key === selectedTagKey;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => onSelect(group.key)}
                aria-current={selected ? 'true' : undefined}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-orange-200 ${selected ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate font-mono text-xs font-bold ${selected ? 'text-orange-700' : 'text-slate-800'}`}>{group.tagId}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500">{group.rfis.length} RFI</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] text-slate-500" title={group.description.title}>{group.description.display}</span>
                  <StatusBadge status={group.status} compact />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RfiListPane({ group, selectedRfiId, ciGroups, linkMap, canViewRfi, onSelect, onView }) {
  return (
    <section className="flex min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-240px)] lg:min-h-[520px]">
      <StepHeader
        number="2"
        icon={FileCheck2}
        title="Linked RFI"
        subtitle={group ? `${group.rfis.length} RFI linked with ${group.tagId}` : 'Select a TAG first'}
      />
      <div className="max-h-[430px] flex-1 overflow-y-auto p-2 lg:max-h-none">
        {!group && <EmptyStep number="2" text="เลือก TAG จากตารางหรือ TAG List เพื่อแสดง RFI ที่ผูกอยู่" />}
        <div className="space-y-1.5">
          {group?.rfis.map(rfi => {
            const selected = rfi.id === selectedRfiId;
            const ciCount = getAssignedCiCount(rfi.id, ciGroups, linkMap);
            return (
              <div key={rfi.id} className={`flex items-stretch gap-1 rounded-xl border transition-all ${selected ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
                <button
                  type="button"
                  onClick={() => onSelect(rfi.id)}
                  aria-current={selected ? 'true' : undefined}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate font-mono text-xs font-bold ${selected ? 'text-orange-700' : 'text-slate-800'}`}>{getRfiDisplayNo(rfi)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${ciCount > 0 ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-400'}`}>{ciCount} CI</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-500" title={getRfiDescription(rfi)}>{getRfiDescription(rfi)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-slate-400">Rev. {getRfiRevision(rfi)}</span>
                    <span className="text-[9px] text-slate-300">•</span>
                    <span className="truncate text-[9px] font-medium text-slate-500">{getRfiDisplayStatus(rfi)}</span>
                  </div>
                </button>
                {canViewRfi && (
                  <button
                    type="button"
                    onClick={() => onView(rfi)}
                    className="my-2 mr-2 inline-flex w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    aria-label={`View RFI ${getRfiDisplayNo(rfi)}`}
                    title="View RFI detail"
                  >
                    <Eye size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CiAssignmentEditor({
  rfi,
  ciGroups,
  initialSelectedIds,
  selectedIds,
  canAssign,
  onChange,
  onReset,
  onSave,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedSet = new Set(selectedIds);
  const initialKey = [...initialSelectedIds].sort().join('|');
  const selectedKey = [...selectedSet].sort().join('|');
  const dirty = initialKey !== selectedKey;

  function toggle(ciId) {
    if (!canAssign || saving) return;
    const next = new Set(selectedSet);
    if (next.has(ciId)) next.delete(ciId);
    else next.add(ciId);
    onChange([...next]);
    setError('');
  }

  async function save() {
    if (!dirty || saving || !canAssign) return;
    setSaving(true);
    setError('');
    try {
      await onSave([...selectedSet]);
      onReset();
    } catch (saveError) {
      setError(saveError?.message || 'บันทึกการผูก CI ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-slate-800">{getRfiDisplayNo(rfi)}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500" title={getRfiDescription(rfi)}>{getRfiDescription(rfi)}</p>
          </div>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-700">{selectedSet.size} selected</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {ciGroups.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
            <ListChecks size={20} className="text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-500">ยังไม่มีกลุ่ม CI</p>
            <p className="mt-1 text-[10px] text-slate-400">กด Create CI ด้านบนเพื่อสร้างคอลัมน์แรก</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
            {ciGroups.map(ci => {
              const checked = selectedSet.has(ci.id);
              return (
                <label
                  key={ci.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'} ${!canAssign || saving ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canAssign || saving}
                    onChange={() => toggle(ci.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                      {ci.code}
                      {checked && <Check size={11} className="text-orange-600" />}
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-500" title={ci.title}>{ci.title}</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-slate-100 bg-slate-50/80 px-4 py-3">
        {error && <p role="alert" className="mb-2 text-[10px] font-medium text-rose-600">{error}</p>}
        {!canAssign && <p className="mb-2 text-[10px] text-amber-600">บัญชีนี้มีสิทธิ์ดูข้อมูลเท่านั้น</p>}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] ${dirty ? 'font-semibold text-orange-600' : 'text-slate-400'}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => { onReset(); setError(''); }}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel changes
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving || !canAssign}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save size={12} /> {saving ? 'Saving...' : 'Save assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CiAssignmentPane({
  rfi,
  ciGroups,
  linkMap,
  draftSelectedIds,
  canCreateCi,
  canAssignCi,
  nextCiCode,
  onCreateCi,
  onDraftChange,
  onDraftReset,
  onSave,
}) {
  const initialSelectedIds = rfi
    ? ciGroups.filter(ci => linkMap.has(getCiRfiLinkKey(rfi.id, ci.id))).map(ci => ci.id)
    : [];
  const activeCiIds = new Set(ciGroups.map(ci => ci.id));
  const selectedIds = (draftSelectedIds ?? initialSelectedIds)
    .filter(ciId => activeCiIds.has(ciId));

  return (
    <section className="flex min-h-[400px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100vh-240px)] lg:min-h-[520px]">
      <StepHeader
        number="3"
        icon={ListChecks}
        title="CI Assignment"
        subtitle={rfi ? 'เลือกได้มากกว่า 1 CI แล้วกดบันทึก' : 'Select an RFI first'}
        action={(
          <button
            type="button"
            onClick={onCreateCi}
            disabled={!canCreateCi}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            title={canCreateCi ? `Create ${nextCiCode}` : 'Read-only permission'}
          >
            <Plus size={12} /> Create CI
          </button>
        )}
      />
      {!rfi ? (
        <EmptyStep number="3" text="เลือก RFI จากส่วนที่ 2 เพื่อกำหนดว่า RFI นี้อยู่ใน CI ใดบ้าง" />
      ) : (
        <CiAssignmentEditor
          key={rfi.id}
          rfi={rfi}
          ciGroups={ciGroups}
          initialSelectedIds={initialSelectedIds}
          selectedIds={selectedIds}
          canAssign={canAssignCi}
          onChange={onDraftChange}
          onReset={onDraftReset}
          onSave={selectedCiIds => onSave(rfi, selectedCiIds)}
        />
      )}
    </section>
  );
}

export function FinalPackageStatusView({
  rfiItems = [],
  tagOptions = [],
  finalPackage = [],
  selectedProjectId = '',
  viewMode = 'matrix',
  dataLoaded = false,
  canCreateCi = true,
  canAssignCi = true,
  canViewRfi = true,
  onOpenWorkflow = () => {},
  onCreateCiGroup = async () => {},
  onSaveCiLinks = async () => {},
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTagKey, setSelectedTagKey] = useState('');
  const [selectedRfiId, setSelectedRfiId] = useState('');
  const [expandedTagKeys, setExpandedTagKeys] = useState(() => new Set());
  const [detailRfi, setDetailRfi] = useState(null);
  const [showCreateCi, setShowCreateCi] = useState(false);
  const [notice, setNotice] = useState('');
  const [assignmentDrafts, setAssignmentDrafts] = useState({});

  const groups = useMemo(
    () => buildTagRfiGroups(rfiItems, tagOptions, selectedProjectId),
    [rfiItems, tagOptions, selectedProjectId],
  );
  const ciGroups = useMemo(
    () => getCiGroups(finalPackage, selectedProjectId),
    [finalPackage, selectedProjectId],
  );
  const ciLinks = useMemo(
    () => {
      const activeCiIds = new Set(ciGroups.map(ci => ci.id));
      return getCiRfiLinks(finalPackage, selectedProjectId)
        .filter(link => activeCiIds.has(link.ciGroupId));
    },
    [ciGroups, finalPackage, selectedProjectId],
  );
  const linkMap = useMemo(() => buildCiRfiLinkMap(ciLinks), [ciLinks]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return groups.filter(group => {
      if (statusFilter && group.status !== statusFilter) return false;
      if (!query) return true;
      const searchable = [
        group.tagId,
        ...group.system.all,
        ...group.subSystem.all,
        ...group.location.all,
        ...group.description.all,
        ...group.rfis.flatMap(rfi => [getRfiDisplayNo(rfi), getRfiDescription(rfi)]),
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [groups, search, statusFilter]);

  const selectedGroup = groups.find(group => group.key === selectedTagKey) || null;
  const selectedMatrixGroup = filteredGroups.find(group => group.key === selectedTagKey) || null;
  const selectedRfi = selectedGroup?.rfis.find(rfi => rfi.id === selectedRfiId) || null;
  const allCiGroupRecords = finalPackage.filter(item => (
    item.projectId === selectedProjectId && item.recordType === CI_GROUP_RECORD_TYPE
  ));
  const nextCiCode = getNextCiCode(allCiGroupRecords);
  const selectedRfiDraft = selectedRfi ? assignmentDrafts[selectedRfi.id] : undefined;
  const hasFilters = Boolean(search.trim() || statusFilter);
  const totalRfiLinks = groups.reduce((sum, group) => sum + group.rfis.length, 0);
  const assignedLinkCount = ciLinks.filter(link => rfiItems.some(rfi => rfi.id === link.rfiId)).length;
  const allExpanded = filteredGroups.length > 0 && filteredGroups.every(g => expandedTagKeys.has(g.key));

  function toggleTag(tagKey) {
    setExpandedTagKeys(current => {
      const next = new Set(current);
      if (next.has(tagKey)) next.delete(tagKey);
      else next.add(tagKey);
      return next;
    });
  }

  function toggleAllExpand() {
    if (allExpanded) {
      setExpandedTagKeys(new Set());
    } else {
      setExpandedTagKeys(new Set(filteredGroups.map(g => g.key)));
    }
  }

  function selectTag(tagKey) {
    if (tagKey !== selectedTagKey) setSelectedRfiId('');
    setSelectedTagKey(tagKey);
    setNotice('');
  }

  function selectRfi(tagKey, rfiId) {
    if (tagKey !== selectedTagKey) setSelectedTagKey(tagKey);
    setSelectedRfiId(rfiId);
    setNotice('');
  }

  function openTagWorkflow(tagKey) {
    selectTag(tagKey);
    onOpenWorkflow();
  }

  function openRfiWorkflow(tagKey, rfiId) {
    selectRfi(tagKey, rfiId);
    onOpenWorkflow();
  }

  function updateAssignmentDraft(rfiId, selectedIds) {
    setAssignmentDrafts(current => ({ ...current, [rfiId]: selectedIds }));
  }

  function resetAssignmentDraft(rfiId) {
    setAssignmentDrafts(current => {
      const next = { ...current };
      delete next[rfiId];
      return next;
    });
  }

  async function createCiGroup(form) {
    await onCreateCiGroup(form);
    setNotice(`${form.code} created. The new CI column is ready.`);
  }

  async function saveCiLinks(rfi, selectedCiIds) {
    await onSaveCiLinks({ rfi, selectedCiIds });
    setNotice(`Saved ${selectedCiIds.length} CI assignment${selectedCiIds.length === 1 ? '' : 's'} for ${getRfiDisplayNo(rfi)}.`);
  }

  return (
    <div className="space-y-4">
      {detailRfi && (
        <RfiDetailModal
          rfi={rfiItems.find(rfi => rfi.id === detailRfi.id) || detailRfi}
          onClose={() => setDetailRfi(null)}
        />
      )}
      {showCreateCi && (
        <CiGroupModal
          code={nextCiCode}
          existingTitles={ciGroups.map(ci => ci.title)}
          onSave={createCiGroup}
          onClose={() => setShowCreateCi(false)}
        />
      )}

      <section
        id="final-package-matrix-panel"
        role="tabpanel"
        aria-labelledby="final-package-tab-status"
        className={`${viewMode === 'matrix' ? 'flex' : 'hidden'} h-[calc(100vh-250px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-orange-600"><Database size={17} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">TAG / CI Matrix</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dataLoaded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dataLoaded ? 'bg-emerald-500' : 'animate-pulse bg-amber-500'}`} />
                  {dataLoaded ? 'Live from RFI' : 'Loading RFI'}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">RFI ที่บันทึกลง CI จะแสดงในคอลัมน์ CI ของทุก TAG ที่ RFI นั้นผูกอยู่</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600"><strong className="text-slate-800">{groups.length}</strong> TAGs</span>
            <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-sky-700"><strong>{totalRfiLinks}</strong> RFI links</span>
            <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-orange-700"><strong>{ciGroups.length}</strong> CI columns</span>
            <span className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-violet-700"><strong>{assignedLinkCount}</strong> assignments</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              placeholder="Search TAG ID, RFI No., description..."
              aria-label="Search TAG and RFI"
            />
          </div>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            aria-label="Filter TAG status"
          >
            <option value="">All TAG status</option>
            {Object.entries(STATUS_CONFIG).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <button
            type="button"
            onClick={toggleAllExpand}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            title={allExpanded ? 'Collapse all TAG groups' : 'Expand all TAG groups'}
          >
            <ChevronsUpDown size={13} className="text-slate-400" />
            <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>
          {hasFilters && (
            <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); }} className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              <X size={13} /> Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-400">
            <span className="hidden items-center gap-1 text-slate-400 sm:inline-flex" title="คลิกและลากเมาส์เพื่อเลื่อนตารางซ้าย-ขวา">
              <MoveHorizontal size={12} className="text-slate-400" />
              <span>Drag to pan</span>
            </span>
            <span>Showing {filteredGroups.length} of {groups.length} TAGs</span>
          </div>
        </div>

        <TagCiMatrix
          groups={filteredGroups}
          ciGroups={ciGroups}
          linkMap={linkMap}
          expandedTagKeys={expandedTagKeys}
          onToggleTag={toggleTag}
          allExpanded={allExpanded}
          onToggleAll={toggleAllExpand}
          onViewRfi={setDetailRfi}
          fullHeight
        />
      </section>

      <div
        id="final-package-assignment-panel"
        role="tabpanel"
        aria-labelledby="final-package-tab-assignment"
        className={`${viewMode === 'workflow' ? 'grid' : 'hidden'} grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.05fr)_minmax(0,1.15fr)]`}
      >
          <TagListPane groups={groups} selectedTagKey={selectedTagKey} onSelect={selectTag} />
          <RfiListPane
            group={selectedGroup}
            selectedRfiId={selectedRfiId}
            ciGroups={ciGroups}
            linkMap={linkMap}
            canViewRfi={canViewRfi}
            onSelect={rfiId => selectRfi(selectedGroup.key, rfiId)}
            onView={setDetailRfi}
          />
          <CiAssignmentPane
            rfi={selectedRfi}
            ciGroups={ciGroups}
            linkMap={linkMap}
            draftSelectedIds={selectedRfiDraft}
            canCreateCi={canCreateCi}
            canAssignCi={canAssignCi}
            nextCiCode={nextCiCode}
            onCreateCi={() => setShowCreateCi(true)}
            onDraftChange={selectedIds => updateAssignmentDraft(selectedRfi.id, selectedIds)}
            onDraftReset={() => resetAssignmentDraft(selectedRfi.id)}
            onSave={saveCiLinks}
          />
      </div>

      <div aria-live="polite" className="min-h-5 text-right text-[11px] font-medium text-emerald-600">
        {notice}
      </div>
    </div>
  );
}

export default function FinalPackageStatusTab({ viewMode = 'matrix', onOpenWorkflow }) {
  const app = useApp();
  const {
    canRead,
    canAction,
    isAdmin,
    hasConfig,
    permissionsReady,
    permissionsError,
  } = useMenuPermissions();
  const permissionsAvailable = permissionsReady && !permissionsError && (hasConfig || isAdmin);
  const canCreateCi = permissionsAvailable && canAction('final-package', 'addFinalDoc');
  const canAssignCi = permissionsAvailable && canAction('final-package', 'editFinalDoc');
  const canViewRfi = permissionsAvailable && canRead('rfi');

  async function createCiGroup({ code, title, description }) {
    if (!canCreateCi) throw new Error('คุณไม่มีสิทธิ์สร้าง CI');
    const projectId = app.selectedProjectId;
    if (!projectId) throw new Error('กรุณาเลือกโปรเจกต์ก่อนสร้าง CI');
    const id = buildCiGroupId(projectId, code);
    const existing = app.finalPackage.find(item => (
      item.projectId === projectId &&
      item.recordType === CI_GROUP_RECORD_TYPE &&
      String(item.code || '').toLocaleLowerCase() === code.toLocaleLowerCase()
    ));
    if (existing) {
      throw new Error(`${code} มีอยู่แล้ว กรุณาลองใหม่`);
    }

    try {
      await app.createFinalPackageItem({
        id,
        recordType: CI_GROUP_RECORD_TYPE,
        schemaVersion: 1,
        projectId,
        code,
        title,
        description,
        sortOrder: Number(code.replace(/^CI-/i, '')) || 0,
        active: true,
      });
    } catch (error) {
      if (error?.code === 'ALREADY_EXISTS') {
        throw new Error(`${code} ถูกสร้างโดยผู้ใช้อื่นแล้ว กรุณาลองสร้างอีกครั้ง`);
      }
      throw error;
    }
  }

  async function saveCiLinks({ rfi, selectedCiIds }) {
    if (!canAssignCi) throw new Error('คุณไม่มีสิทธิ์แก้ไขการผูก CI');
    const projectId = app.selectedProjectId;
    const currentRfi = app.rfiItems.find(item => item.id === rfi.id && item.projectId === projectId);
    if (!currentRfi) throw new Error('ไม่พบ RFI นี้ในโปรเจกต์ปัจจุบัน กรุณาโหลดข้อมูลใหม่');

    const ciGroups = getCiGroups(app.finalPackage, projectId);
    const selectedSet = new Set(selectedCiIds);
    const assignments = ciGroups.map(ci => ({
      id: buildCiRfiLinkId(projectId, currentRfi.id, ci.id),
      ciGroupId: ci.id,
      ciCode: ci.code,
      active: selectedSet.has(ci.id),
    }));

    try {
      await app.saveFinalPackageCiAssignments({
        projectId,
        rfiId: currentRfi.id,
        rfiNo: getRfiDisplayNo(currentRfi),
        assignments,
      });
    } catch (error) {
      if (error?.code === 'REFERENCE_CHANGED' || error?.code === 'DATA_CONFLICT') {
        throw new Error('ข้อมูล RFI หรือ CI มีการเปลี่ยนแปลง กรุณาตรวจสอบแล้วบันทึกอีกครั้ง');
      }
      throw error;
    }
  }

  return (
    <FinalPackageStatusView
      key={app.selectedProjectId || 'no-project'}
      {...app}
      viewMode={viewMode}
      canCreateCi={canCreateCi}
      canAssignCi={canAssignCi}
      canViewRfi={canViewRfi}
      onOpenWorkflow={onOpenWorkflow}
      onCreateCiGroup={createCiGroup}
      onSaveCiLinks={saveCiLinks}
    />
  );
}
