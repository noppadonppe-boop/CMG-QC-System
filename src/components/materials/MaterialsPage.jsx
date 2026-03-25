import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ExternalLink, Package, CheckCircle2, XCircle, Clock, PauseCircle, FileCheck, History } from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import MaterialModal from './MaterialModal';
import MaterialApproveModal from './MaterialApproveModal';

const RESULT_BADGE = {
  'Pass':    'bg-green-100 text-green-700',
  'Reject':  'bg-red-100 text-red-700',
  'Pending': 'bg-slate-100 text-slate-500',
  'Hold':    'bg-amber-100 text-amber-700',
};
const RESULT_ICON = {
  'Pass':    <CheckCircle2 size={13} className="text-green-500" />,
  'Reject':  <XCircle size={13} className="text-red-500" />,
  'Pending': <Clock size={13} className="text-slate-400" />,
  'Hold':    <PauseCircle size={13} className="text-amber-500" />,
};

function ConfirmDelete({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Delete Record?</h3>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
          <div className="text-xs font-bold text-slate-700">{item.matRevNo}</div>
          <div className="text-[11px] text-slate-500 truncate">{item.description}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const { materials, addMaterial, updateMaterial, deleteMaterial, selectedProjectId, selectedProject } = useApp();
  const { userProfile } = useAuth();
  const { canAction } = useMenuPermissions();

  const [activeTab,    setActiveTab]    = useState('receive');
  const [search,       setSearch]       = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [modalMode,    setModalMode]    = useState(null);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  const canAddMaterial    = canAction('materials', 'addMaterial');
  const canEditMaterial   = canAction('materials', 'editMaterial');
  const canDeleteMaterial = canAction('materials', 'deleteMaterial');

  const projectItems = materials.filter(m => m.projectId === selectedProjectId);

  const filtered = projectItems.filter(m => {
    const matchSearch = !search ||
      m.matRevNo.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier || '').toLowerCase().includes(search.toLowerCase());
    const matchResult = !filterResult || m.result === filterResult;
    const matchCat    = !filterCat    || m.category === filterCat;
    return matchSearch && matchResult && matchCat;
  });

  const categories = [...new Set(projectItems.map(m => m.category).filter(Boolean))];

  function handleSave(form) {
    if (modalMode === 'add') {
      addMaterial({ ...form, id: `mat-${Date.now()}`, projectId: selectedProjectId });
    } else {
      updateMaterial(editTarget.id, form);
    }
    setModalMode(null);
    setEditTarget(null);
  }

  function handleApprovalSave(material, approvalData) {
    const updatedMaterial = {
      ...material,
      approvals: [...(material.approvals || []), approvalData]
    };
    updateMaterial(material.id, updatedMaterial);
    setApproveTarget(null);
  }

  const counts = {
    total:   projectItems.length,
    pass:    projectItems.filter(m => m.result === 'Pass').length,
    reject:  projectItems.filter(m => m.result === 'Reject').length,
    pending: projectItems.filter(m => m.result === 'Pending').length,
    hold:    projectItems.filter(m => m.result === 'Hold').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Material Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — Material Receive & Approval System</p>
        </div>
        {canAddMaterial && activeTab === 'receive' && (
          <button
            onClick={() => setModalMode('add')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Material Receive Record
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('receive')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'receive' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={16} />
          Material Receive
        </button>
        <button
          onClick={() => setActiveTab('approve-log')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'approve-log' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History size={16} />
          Log Material Approve
        </button>
      </div>

{/* Material Receive Tab Content */}
      {activeTab === 'receive' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Total',   value: counts.total,   color: 'text-slate-700',  bg: 'bg-slate-100', icon: <Package size={16} className="text-slate-500" /> },
              { label: 'Pass',    value: counts.pass,    color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle2 size={16} className="text-green-500" /> },
              { label: 'Reject',  value: counts.reject,  color: 'text-red-700',    bg: 'bg-red-50',    icon: <XCircle size={16} className="text-red-500" /> },
              { label: 'Pending', value: counts.pending, color: 'text-slate-600',  bg: 'bg-slate-50',  icon: <Clock size={16} className="text-slate-400" /> },
              { label: 'Hold',    value: counts.hold,    color: 'text-amber-700',  bg: 'bg-amber-50',  icon: <PauseCircle size={16} className="text-amber-500" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-slate-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 w-64 text-slate-700 placeholder-slate-400"
            placeholder="Search by Rev No., description, supplier…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
          value={filterResult}
          onChange={e => setFilterResult(e.target.value)}
        >
          <option value="">All Results</option>
          {['Pass', 'Reject', 'Pending', 'Hold'].map(r => <option key={r}>{r}</option>)}
        </select>
        {categories.length > 0 && (
          <select
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
            <span className="ml-auto text-[11px] text-slate-500">{filtered.length} records</span>
          </div>

          {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['#', 'Mat. Rev. No.', 'Receive Date', 'Category', 'Description', 'Supplier', 'Qty / Unit', 'Spec / Package', 'Test Doc', 'Result', 'Note', 'Material Approve', (canEditMaterial || canDeleteMaterial) ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">
                    No material records for <span className="font-semibold">{selectedProject?.name}</span>.
                  </td>
                </tr>
              )}
              {filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-teal-700 whitespace-nowrap">{item.matRevNo}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">{item.receiveDate || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                      {item.category || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 max-w-[200px]">
                    <div className="truncate" title={item.description}>{item.description}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.supplier || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {item.quantity ? `${item.quantity} ${item.unit || ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{item.materialSpecPackage || '—'}</td>
                  <td className="px-4 py-3">
                    {item.includeTestResult ? (
                      item.testCertLink ? (
                        <a href={item.testCertLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap">
                          <ExternalLink size={11} /> View
                        </a>
                      ) : (
                        <span className="text-[11px] text-green-600 font-medium">✓ Included</span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full w-fit whitespace-nowrap ${RESULT_BADGE[item.result] || 'bg-slate-100 text-slate-500'}`}>
                      {RESULT_ICON[item.result]}
                      {item.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                    <div className="text-[11px] truncate" title={item.noteOfTest}>{item.noteOfTest || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      // Calculate remaining quantity
                      const totalQuantity = parseFloat(item.quantity) || 0;
                      const approvedQuantity = (item.approvals || []).reduce((sum, approval) => {
                        return sum + (parseFloat(approval.approvedQuantity) || 0);
                      }, 0);
                      const remainingQuantity = totalQuantity - approvedQuantity;

                      // Hide button if quantity is zero or fully approved
                      if (remainingQuantity <= 0) {
                        return (
                          <span className="text-[10px] text-green-600 font-semibold">✓ Quantity Complete</span>
                        );
                      }

                      // Show button with remaining quantity
                      return (
                        <button
                          onClick={() => setApproveTarget(item)}
                          className="flex flex-col items-center gap-0.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <FileCheck size={12} />
                            Material Approve
                          </div>
                          <div className="text-[9px] text-green-200">
                            Remaining: {remainingQuantity} {item.unit}
                          </div>
                        </button>
                      );
                    })()}
                  </td>
                  {(canEditMaterial || canDeleteMaterial) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditMaterial && (
                          <button
                            onClick={() => { setEditTarget(item); setModalMode('edit'); }}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            <Pencil size={12} className="text-blue-600" />
                          </button>
                        )}
                        {canDeleteMaterial && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''} shown
              {(search || filterResult || filterCat) && ` (filtered from ${projectItems.length})`}
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-green-600 font-semibold">✅ {counts.pass} Pass</span>
              <span className="text-red-600 font-semibold">❌ {counts.reject} Reject</span>
              <span className="text-amber-600 font-semibold">⏸ {counts.hold} Hold</span>
            </div>
          </div>
          )}
          </div>
        </>
      )}

      {/* Log Material Approve Tab Content */}
      {activeTab === 'approve-log' && (
        <>
          {/* Approval Log Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Materials with Approvals', value: projectItems.filter(m => m.approvals?.length > 0).length, color: 'text-green-700', bg: 'bg-green-50', icon: <FileCheck size={16} className="text-green-500" /> },
              { label: 'Final Approved', value: projectItems.filter(m => m.approvals?.some(a => a.approvalType === 'Final Approve')).length, color: 'text-blue-700', bg: 'bg-blue-50', icon: <CheckCircle2 size={16} className="text-blue-500" /> },
              { label: 'Pending Approvals', value: projectItems.filter(m => !m.approvals?.some(a => a.approvalType === 'Final Approve')).length, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={16} className="text-amber-500" /> },
              { label: 'Total Approvals', value: projectItems.reduce((sum, m) => sum + (m.approvals?.length || 0), 0), color: 'text-slate-700', bg: 'bg-slate-100', icon: <History size={16} className="text-slate-500" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-slate-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Approval Log Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {['#', 'Material Rev. No.', 'Description', 'Approval Type', 'Approved Qty', 'Result', 'Approved By', 'Date', 'Version', 'Documents', 'Comments'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(() => {
                    const approvalLogs = [];
                    projectItems.forEach(material => {
                      if (material.approvals?.length > 0) {
                        material.approvals.forEach((approval, idx) => {
                          approvalLogs.push({
                            ...approval,
                            material,
                            version: idx + 1,
                          });
                        });
                      }
                    });
                    approvalLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    
                    if (approvalLogs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="px-3 py-12 text-center text-slate-400">
                            No approval records found for <span className="font-semibold">{selectedProject?.name}</span>.
                          </td>
                        </tr>
                      );
                    }

                    return approvalLogs.map((log, idx) => (
                      <tr key={`${log.material.id}-${log.version}`} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-3 font-mono font-bold text-green-700 whitespace-nowrap">{log.material.matRevNo}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-[200px]">
                          <div className="truncate font-medium" title={log.material.description}>{log.material.description}</div>
                          <div className="text-[10px] text-slate-500">{log.material.category}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                            {log.approvalType}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[11px] font-semibold text-blue-700">
                            {log.approvedQuantity || '—'} {log.material.unit}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            of {log.material.quantity} {log.material.unit}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            log.result === 'Approved' ? 'bg-green-100 text-green-700' :
                            log.result === 'Approved with Comments' ? 'bg-blue-100 text-blue-700' :
                            log.result === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {log.result === 'Approved' ? '✅' : log.result === 'Approved with Comments' ? '💬' : log.result === 'Rejected' ? '❌' : '⏸'} {log.result}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{log.approvedBy}</td>
                        <td className="px-3 py-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.approvalDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            #{log.version}
                          </span>
                        </td>
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
                                  📄 {doc.name.length > 10 ? doc.name.substring(0, 10) + '...' : doc.name}
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
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <MaterialModal
          item={modalMode === 'edit' ? editTarget : null}
          onSave={handleSave}
          onClose={() => { setModalMode(null); setEditTarget(null); }}
        />
      )}
      {approveTarget && (
        <MaterialApproveModal
          material={approveTarget}
          onSave={handleApprovalSave}
          onClose={() => setApproveTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          item={deleteTarget}
          onConfirm={() => { deleteMaterial(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
