import { useMemo, useState } from 'react';
import {
  Search, Package, CheckCircle2, Clock, FileCheck, History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import MaterialApproveModal from './MaterialApproveModal';
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
  { key: 'actions', label: 'Actions', locked: true },
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
  'Approved': 'bg-green-100 text-green-700',
  'Approved with Comments': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Hold for Review': 'bg-amber-100 text-amber-700',
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

export default function MaterialsPage() {
  const {
    qcDocuments,
    materialApprovals,
    addMaterialApproval,
    selectedProjectId,
    selectedProject,
  } = useApp();
  const { canAction } = useMenuPermissions();

  const [activeTab, setActiveTab] = useState('receive');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [approveTarget, setApproveTarget] = useState(null);

  const canLogApproval = canAction('materials', 'editMaterial');

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

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return projectItems.filter((item) => {
      const latestApproval = getLatestApproval(approvalsByDocId.get(item.id) || []);
      const approvalStatus = latestApproval?.result || 'Pending';

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
  }, [approvalsByDocId, filterStatus, projectItems, search]);

  const qcStatuses = [...new Set(projectItems.map(item => item.status).filter(Boolean))];

  const counts = {
    total: projectItems.length,
    approvedDocs: projectItems.filter(item => item.status === 'Approved').length,
    withApprovalLog: projectItems.filter(item => (approvalsByDocId.get(item.id) || []).length > 0).length,
    pendingApproval: projectItems.filter(item => (approvalsByDocId.get(item.id) || []).length === 0).length,
    totalApprovalLogs: projectApprovalItems.length,
  };

  function handleApprovalSave(approvalData) {
    addMaterialApproval({
      ...approvalData,
      id: `mat-approve-${Date.now()}`,
    });
    setApproveTarget(null);
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
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Total', value: counts.total, color: 'text-slate-700', bg: 'bg-slate-100', icon: <Package size={16} className="text-slate-500" /> },
              { label: 'Approved Docs', value: counts.approvedDocs, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 size={16} className="text-green-500" /> },
              { label: 'With Approval Log', value: counts.withApprovalLog, color: 'text-blue-700', bg: 'bg-blue-50', icon: <FileCheck size={16} className="text-blue-500" /> },
              { label: 'Pending Log', value: counts.pendingApproval, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={16} className="text-amber-500" /> },
              { label: 'Approval Logs', value: counts.totalApprovalLogs, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <History size={16} className="text-emerald-500" /> },
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

          <TableColumnVisibility
            storageKey="materials-table-columns"
            tableId="materials-table"
            columns={MATERIAL_TABLE_COLUMNS}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 pt-3"
          >
            <div className="overflow-x-auto">
              <table data-column-table="materials-table" className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {['#', 'TRANSMITTAL NO', 'MAP NO.', 'RFI No.', 'TYPE', 'DOCUMENT TITLE', 'DOCUMENT STATUS', 'REV', 'Issue Date', 'STATUS', canLogApproval ? 'Actions' : ''].filter(Boolean).map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={canLogApproval ? 11 : 10} className="px-4 py-12 text-center text-slate-400">
                        No material approved documents for <span className="font-semibold">{selectedProject?.name}</span>.
                      </td>
                    </tr>
                  )}
                  {filtered.map((item, idx) => {
                    const latestApproval = getLatestApproval(approvalsByDocId.get(item.id) || []);
                    const approvalStatus = latestApproval?.result || 'Pending';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-700 whitespace-nowrap">{item.transmittalNo || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.documentNo || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]"></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${item.isExternal ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                            {getDocumentType(item)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 max-w-[260px]">
                          <div className="truncate" title={item.documentTitle}>{item.documentTitle || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap bg-slate-100 text-slate-700">
                            {item.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.rev || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.receiveDate || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${APPROVAL_BADGE[approvalStatus] || APPROVAL_BADGE.Pending}`}>
                            {approvalStatus}
                          </span>
                        </td>
                        {canLogApproval && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setApproveTarget(item)}
                              className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <FileCheck size={12} />
                                Log Approve
                              </div>
                              <div className="text-[9px] text-green-200">
                                {(approvalsByDocId.get(item.id) || []).length} record(s)
                              </div>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TableColumnVisibility>
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

      {approveTarget && (
        <MaterialApproveModal
          documentRecord={approveTarget}
          approvalCount={(approvalsByDocId.get(approveTarget.id) || []).length}
          onSave={handleApprovalSave}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  );
}
