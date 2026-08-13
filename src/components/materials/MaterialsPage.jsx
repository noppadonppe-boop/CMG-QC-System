import { useMemo, useState } from 'react';
import {
  Search, Package, CheckCircle2, Clock, FileCheck, History, Layers3, Eye, XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { MaterialCombineModal, MaterialCombinedDetailModal } from './MaterialCombineModals';
import Modal from '../common/Modal';
import TableColumnVisibility from '../common/TableColumnVisibility';

const MATERIAL_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'transmittalNo', label: 'TRANSMITTAL NO' },
  { key: 'mapNo', label: 'MAP NO.' },
  { key: 'rfiNo', label: 'RFI No.' },
  { key: 'type', label: 'TYPE' },
  { key: 'documentTitle', label: 'DOCUMENT TITLE' },
  { key: 'documentStatus', label: 'DOCUMENT STATUS' },
  { key: 'rev', label: 'REV' },
  { key: 'issueDate', label: 'Issue Date' },
  { key: 'status', label: 'STATUS' },
];

const EXTERNAL_MATERIAL_TABLE_COLUMNS = [
  ...MATERIAL_TABLE_COLUMNS,
  { key: 'combine', label: 'Combine', locked: true },
];

const MATERIAL_APPROVAL_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'transmittalNo', label: 'Transmittal No.' },
  { key: 'mapNo', label: 'MAP No.' },
  { key: 'rfiNo', label: 'RFI No.' },
  { key: 'type', label: 'Type' },
  { key: 'documentTitle', label: 'Document Title' },
  { key: 'approvalType', label: 'Approval Type' },
  { key: 'result', label: 'Result' },
  { key: 'approvedBy', label: 'Approved By' },
  { key: 'date', label: 'Date' },
  { key: 'documentStatus', label: 'Doc Status' },
  { key: 'documents', label: 'Documents' },
  { key: 'comments', label: 'Comments' },
];

const APPROVAL_BADGE = {
  'Approve': 'bg-green-100 text-green-700',
  'Approved': 'bg-green-100 text-green-700',
  'Approved with Comments': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Hold for Review': 'bg-amber-100 text-amber-700',
  'Cancel': 'bg-red-100 text-red-700',
  'Pending': 'bg-slate-100 text-slate-600',
};

function getRfiNo(item) {
  return item.rfiNo || item.transmittalNoRef || '';
}

function getDocumentType(item) {
  return item?.isExternal ? 'External' : 'Internal';
}

function getLatestApproval(approvals = []) {
  if (!approvals.length) return null;
  return [...approvals].sort((a, b) => new Date(b.timestamp || b.approvalDate || 0) - new Date(a.timestamp || a.approvalDate || 0))[0];
}

function getMaterialStatus(item, approvalsByDocId, combinedInternalIdSet) {
  if (item.materialStatus === 'Cancel') return 'Cancel';
  const isCombined = (
    (item.isExternal && Array.isArray(item.combinedInternalIds) && item.combinedInternalIds.length > 0) ||
    (!item.isExternal && combinedInternalIdSet.has(item.id))
  );
  if (isCombined) return 'Approve';
  return getLatestApproval(approvalsByDocId.get(item.id) || [])?.result || 'Pending';
}

export default function MaterialsPage() {
  const {
    qcDocuments,
    materialApprovals,
    updateQcDocument,
    selectedProjectId,
    selectedProject,
  } = useApp();
  const { canAction } = useMenuPermissions();

  const [activeTab, setActiveTab] = useState('receive');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [combineTarget, setCombineTarget] = useState(null);
  const [combinedDetailTarget, setCombinedDetailTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelConfirmation, setCancelConfirmation] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const canEditMaterial = canAction('materials', 'editMaterial');

  const projectItems = useMemo(() => (
    qcDocuments.filter((doc) => (
      doc.projectId === selectedProjectId &&
      doc.categoryGroup === 'Material approved'
    ))
  ), [qcDocuments, selectedProjectId]);

  const projectApprovalItems = useMemo(() => (
    materialApprovals
      .filter((item) => item.projectId === selectedProjectId)
      .sort((a, b) => new Date(b.timestamp || b.approvalDate || 0) - new Date(a.timestamp || a.approvalDate || 0))
  ), [materialApprovals, selectedProjectId]);

  const projectItemsByKey = useMemo(() => {
    const map = new Map();
    projectItems.forEach((item) => {
      if (item.id) map.set(item.id, item);
      if (item.documentNo) map.set(item.documentNo, item);
    });
    return map;
  }, [projectItems]);

  const approvalsByDocId = useMemo(() => {
    const map = new Map();
    projectApprovalItems.forEach((approval) => {
      const key = approval.sourceDocId || approval.documentNo;
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(approval);
    });
    return map;
  }, [projectApprovalItems]);

  const combinedInternalIdSet = useMemo(() => {
    const ids = new Set();
    projectItems.forEach(item => {
      if (!item.isExternal || !Array.isArray(item.combinedInternalIds)) return;
      item.combinedInternalIds.forEach(id => ids.add(id));
    });
    return ids;
  }, [projectItems]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return projectItems.filter((item) => {
      const approvalStatus = getMaterialStatus(item, approvalsByDocId, combinedInternalIdSet);

      const matchesSearch = !keyword || [
        item.transmittalNo,
        item.documentNo,
        item.documentTitle,
        item.status,
        getRfiNo(item),
        getDocumentType(item),
        approvalStatus,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = !filterStatus || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [approvalsByDocId, combinedInternalIdSet, filterStatus, projectItems, search]);

  const filteredByType = useMemo(() => ({
    internal: filtered.filter(item => !item.isExternal),
    external: filtered.filter(item => item.isExternal),
  }), [filtered]);

  const internalProjectItems = useMemo(
    () => projectItems.filter(item => !item.isExternal),
    [projectItems],
  );

  const combinedDetailInternalItems = useMemo(() => {
    const combinedIds = Array.isArray(combinedDetailTarget?.combinedInternalIds)
      ? combinedDetailTarget.combinedInternalIds
      : [];
    const byId = new Map(internalProjectItems.map(item => [item.id, item]));
    return combinedIds.map(id => byId.get(id)).filter(Boolean);
  }, [combinedDetailTarget, internalProjectItems]);

  const qcStatuses = [...new Set(projectItems.map(item => item.status).filter(Boolean))];

  function summarizeByStatus(items) {
    return {
      total: items.length,
      approve: items.filter(item => ['Approve', 'Approved'].includes(getMaterialStatus(item, approvalsByDocId, combinedInternalIdSet))).length,
      pending: items.filter(item => getMaterialStatus(item, approvalsByDocId, combinedInternalIdSet) === 'Pending').length,
    };
  }

  const materialCountsByType = {
    external: summarizeByStatus(projectItems.filter(item => item.isExternal)),
    internal: summarizeByStatus(internalProjectItems),
  };

  const counts = {
    withApprovalLog: projectItems.filter(item => (approvalsByDocId.get(item.id) || []).length > 0).length,
    totalApprovalLogs: projectApprovalItems.length,
  };

  async function handleCombineSave(combinedInternalIds) {
    if (!combineTarget) return;
    await updateQcDocument(combineTarget.id, {
      combinedInternalIds,
      combinedUpdatedAt: new Date().toISOString(),
    });
    setCombineTarget(null);
  }

  async function handleCancelMaterial(item) {
    await updateQcDocument(item.id, {
      materialStatus: 'Cancel',
      materialCancelledAt: new Date().toISOString(),
    });
  }

  function openCancelConfirmation(item) {
    setCancelTarget(item);
    setCancelConfirmation('');
    setCancelError('');
  }

  function closeCancelConfirmation() {
    if (isCancelling) return;
    setCancelTarget(null);
    setCancelConfirmation('');
    setCancelError('');
  }

  async function confirmCancelMaterial() {
    if (!cancelTarget || cancelConfirmation !== 'ตกลง') return;
    setIsCancelling(true);
    setCancelError('');
    try {
      await handleCancelMaterial(cancelTarget);
      setCancelTarget(null);
      setCancelConfirmation('');
    } catch (error) {
      setCancelError(error?.message || 'Unable to cancel this material.');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">Material Management</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{selectedProject?.name} - Data from QC Document Control</p>
        </div>
      </div>

      <div className="inline-flex bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('receive')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'receive'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={14} />
          Material Receive
        </button>
        <button
          onClick={() => setActiveTab('approve-log')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'approve-log'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={14} />
          Log Material Approve
        </button>
      </div>

      {activeTab === 'receive' && (
        <>
          <div className="flex flex-wrap items-stretch gap-3">
            {[
              { key: 'external', label: 'External', counts: materialCountsByType.external, showApprove: true, accent: 'text-sky-700', panel: 'border-sky-100 bg-sky-50/50' },
              { key: 'internal', label: 'Internal', counts: materialCountsByType.internal, showApprove: false, accent: 'text-violet-700', panel: 'border-violet-100 bg-violet-50/50' },
            ].map(group => (
              <div key={group.key} className={`rounded-xl border p-2 ${group.panel}`}>
                <div className={`mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider ${group.accent}`}>{group.label}</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Total', value: group.counts.total, color: 'text-slate-700', bg: 'bg-slate-100', icon: <Package size={16} className="text-slate-500" /> },
                    ...(group.showApprove ? [{ label: 'Approve', value: group.counts.approve, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 size={16} className="text-green-500" /> }] : []),
                    { label: 'Pending', value: group.counts.pending, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={16} className="text-amber-500" /> },
                  ].map(summary => (
                    <div key={summary.label} className="flex min-w-24 items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-1.5 shadow-sm">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${summary.bg}`}>
                        {summary.icon}
                      </div>
                      <div className="leading-tight">
                        <div className={`text-sm font-bold ${summary.color}`}>{summary.value}</div>
                        <div className="whitespace-nowrap text-[10px] text-slate-500">{summary.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-72 text-slate-700 placeholder-slate-400"
                placeholder="Search by transmittal no., MAP no., RFI no., title..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Document Status</option>
              {qcStatuses.map(status => <option key={status}>{status}</option>)}
            </select>
            <span className="ml-auto text-[11px] text-slate-500">{filtered.length} records</span>
          </div>

          {[
            { key: 'external', label: 'External Materials', items: filteredByType.external, dotClass: 'bg-sky-500', columns: EXTERNAL_MATERIAL_TABLE_COLUMNS },
            { key: 'internal', label: 'Internal Materials', items: filteredByType.internal, dotClass: 'bg-violet-500', columns: MATERIAL_TABLE_COLUMNS },
          ].map(section => (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${section.dotClass}`} />
                  <h2 className="text-sm font-bold text-slate-800">{section.label}</h2>
                </div>
                <span className="text-[11px] font-medium text-slate-500">{section.items.length} records</span>
              </div>
              <TableColumnVisibility
                storageKey={`materials-${section.key}-table-columns`}
                tableId={`materials-${section.key}-table`}
                columns={section.columns}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 pt-3"
              >
                <div className="overflow-x-auto">
                  <table data-column-table={`materials-${section.key}-table`} className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {section.columns.map(column => (
                      <th key={column.key} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {section.items.length === 0 && (
                    <tr>
                      <td colSpan={section.columns.length} className="px-4 py-12 text-center text-slate-400">
                        No {section.key} material approved documents for <span className="font-semibold">{selectedProject?.name}</span>.
                      </td>
                    </tr>
                  )}
                  {section.items.map((item, idx) => {
                    const approvalStatus = getMaterialStatus(item, approvalsByDocId, combinedInternalIdSet);
                    return (
                      <tr
                        key={item.id}
                        onClick={section.key === 'external' ? () => setCombinedDetailTarget(item) : undefined}
                        className={`hover:bg-slate-50 transition-colors group ${section.key === 'external' ? 'cursor-pointer' : ''}`}
                      >
                        <td className="px-4 py-1.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-1.5 font-mono font-bold text-teal-700 whitespace-nowrap">{item.transmittalNo || '—'}</td>
                        <td className="px-4 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.documentNo || '—'}</td>
                        <td className="px-4 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">{getRfiNo(item) || '—'}</td>
                        <td className="px-4 py-1.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${item.isExternal ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                            {getDocumentType(item)}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 font-semibold text-slate-800 max-w-[260px]">
                          <div className="truncate" title={item.documentTitle}>{item.documentTitle || '—'}</div>
                        </td>
                        <td className="px-4 py-1.5">
                          <span className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap bg-slate-100 text-slate-700">
                            {item.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.rev || '—'}</td>
                        <td className="px-4 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.receiveDate || '—'}</td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${APPROVAL_BADGE[approvalStatus] || APPROVAL_BADGE.Pending}`}>
                              {approvalStatus}
                            </span>
                            {section.key === 'internal' && canEditMaterial && !['Approve', 'Approved', 'Cancel'].includes(approvalStatus) && (
                              <button
                                type="button"
                                onClick={() => openCancelConfirmation(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                              >
                                <XCircle size={12} />
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                        {section.key === 'external' && (
                          <td className="px-4 py-1.5">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              {canEditMaterial && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setCombineTarget(item);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-violet-700"
                                >
                                  <Layers3 size={12} />
                                  Combine
                                </button>
                              )}
                              {Array.isArray(item.combinedInternalIds) && item.combinedInternalIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setCombinedDetailTarget(item);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                                >
                                  <Eye size={12} />
                                  View ({item.combinedInternalIds.length})
                                </button>
                              )}
                              {!canEditMaterial && (!Array.isArray(item.combinedInternalIds) || item.combinedInternalIds.length === 0) && (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                  </table>
                </div>
              </TableColumnVisibility>
            </section>
          ))}
        </>
      )}

      {activeTab === 'approve-log' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Documents with Logs', value: counts.withApprovalLog, color: 'text-green-700', bg: 'bg-green-50', icon: <FileCheck size={16} className="text-green-500" /> },
              { label: 'Final Approved', value: projectApprovalItems.filter(item => item.approvalType === 'Final Approve').length, color: 'text-blue-700', bg: 'bg-blue-50', icon: <CheckCircle2 size={16} className="text-blue-500" /> },
              { label: 'Hold / Rejected', value: projectApprovalItems.filter(item => ['Rejected', 'Hold for Review'].includes(item.result)).length, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={16} className="text-amber-500" /> },
              { label: 'Total Logs', value: counts.totalApprovalLogs, color: 'text-slate-700', bg: 'bg-slate-100', icon: <History size={16} className="text-slate-500" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  {s.icon}
                </div>
                <div className="leading-tight">
                  <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <TableColumnVisibility
            storageKey="materials-approval-table-columns"
            tableId="materials-approval-table"
            columns={MATERIAL_APPROVAL_TABLE_COLUMNS}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 pt-3"
          >
            <div className="overflow-x-auto">
              <table data-column-table="materials-approval-table" className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {['#', 'Transmittal No.', 'MAP No.', 'RFI No.', 'Type', 'Document Title', 'Approval Type', 'Result', 'Approved By', 'Date', 'Doc Status', 'Documents', 'Comments'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projectApprovalItems.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-3 py-12 text-center text-slate-400">
                        No approval records found for <span className="font-semibold">{selectedProject?.name}</span>.
                      </td>
                    </tr>
                  )}

                  {projectApprovalItems.map((log, idx) => {
                    const sourceItem = projectItemsByKey.get(log.sourceDocId) || projectItemsByKey.get(log.documentNo);
                    const typeLabel = log.documentType || getDocumentType(sourceItem);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-green-700 whitespace-nowrap">{log.transmittalNo || '—'}</td>
                      <td className="px-3 py-3 font-mono text-slate-700 whitespace-nowrap">{log.mapNo || log.documentNo || '—'}</td>
                      <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap"></td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${typeLabel === 'External' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700 max-w-[220px]">
                        <div className="truncate font-medium" title={log.documentTitle}>{log.documentTitle || '—'}</div>
                        <div className="text-[10px] text-slate-500">Rev. {log.rev || '—'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {log.approvalType}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${APPROVAL_BADGE[log.result] || APPROVAL_BADGE.Pending}`}>
                          {log.result}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{log.approvedBy || '—'}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {log.approvalDate ? new Date(log.approvalDate).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{log.documentStatus || '—'}</td>
                      <td className="px-3 py-3">
                        {log.documents?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.documents.map((doc, docIdx) => (
                              <a
                                key={docIdx}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                                title={doc.name}
                              >
                                {doc.name.length > 14 ? `${doc.name.substring(0, 14)}...` : doc.name}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-500 max-w-[200px]">
                        <div className="text-[11px] truncate" title={log.comments}>{log.comments || '—'}</div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TableColumnVisibility>
        </>
      )}

      {combineTarget && (
        <MaterialCombineModal
          externalDocument={combineTarget}
          internalDocuments={internalProjectItems}
          onSave={handleCombineSave}
          onClose={() => setCombineTarget(null)}
        />
      )}

      {combinedDetailTarget && (
        <MaterialCombinedDetailModal
          externalDocument={combinedDetailTarget}
          internalDocuments={combinedDetailInternalItems}
          onClose={() => setCombinedDetailTarget(null)}
        />
      )}

      {cancelTarget && (
        <Modal title="ยืนยันการยกเลิกรายการ" onClose={closeCancelConfirmation} size="sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-800">คุณต้องการลบรายการนี้ใช่หรือไม่?</p>
              <p className="mt-1 text-xs text-slate-500">
                รายการ <span className="font-semibold text-slate-700">{cancelTarget.documentNo || cancelTarget.transmittalNo || 'Internal Material'}</span>
                {' '}จะเปลี่ยนสถานะเป็น Cancel และจะไม่แสดงในหน้าต่าง Combine Internal Materials
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">รายละเอียดรายการ</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <div className="text-[10px] font-medium text-slate-400">TRANSMITTAL NO.</div>
                  <div className="font-semibold text-slate-700">{cancelTarget.transmittalNo || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-400">MAP NO.</div>
                  <div className="font-semibold text-slate-700">{cancelTarget.documentNo || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-400">RFI NO.</div>
                  <div className="font-semibold text-slate-700">{getRfiNo(cancelTarget) || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-slate-400">REV</div>
                  <div className="font-semibold text-slate-700">{cancelTarget.rev || '—'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] font-medium text-slate-400">DOCUMENT TITLE</div>
                  <div className="font-semibold text-slate-700">{cancelTarget.documentTitle || '—'}</div>
                </div>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              พิมพ์ <span className="text-red-600">ตกลง</span> เพื่อยืนยัน
              <input
                type="text"
                value={cancelConfirmation}
                onChange={event => setCancelConfirmation(event.target.value)}
                disabled={isCancelling}
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
                placeholder="ตกลง"
              />
            </label>
            {cancelError && <p className="text-xs font-medium text-red-600">{cancelError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeCancelConfirmation}
                disabled={isCancelling}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                กลับ
              </button>
              <button
                type="button"
                onClick={confirmCancelMaterial}
                disabled={isCancelling || cancelConfirmation !== 'ตกลง'}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? 'กำลังบันทึก...' : 'ยืนยัน Cancel'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
