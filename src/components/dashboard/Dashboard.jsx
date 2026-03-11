import {
  FileText, ClipboardList, AlertTriangle, PackageCheck,
  ListChecks, TrendingUp, CheckCircle2, Clock, XCircle
} from 'lucide-react';
import { useApp }  from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '../../auth/constants';

function StatCard({ icon: Icon, label, value, sub, color, bgColor }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>
        <Icon size={20} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs font-medium text-slate-500 truncate">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Active:   'bg-green-100 text-green-700',
    Handover: 'bg-blue-100 text-blue-700',
    Closed:   'bg-slate-100 text-slate-600',
    Pass:     'bg-green-100 text-green-700',
    Reject:   'bg-red-100 text-red-700',
    Pending:  'bg-yellow-100 text-yellow-700',
    ongoing:  'bg-blue-100 text-blue-700',
    hold:     'bg-orange-100 text-orange-700',
    close:    'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const {
    selectedProject,
    qcDocuments, itpItems, rfiItems, materials,
    ncrItems, punchlist, visibleProjects,
  } = useApp();
  const { userProfile } = useAuth();
  const userRoles    = userProfile?.role ?? [];
  const firstName    = userProfile?.firstName ?? '';
  const lastName     = userProfile?.lastName  ?? '';
  const displayName  = (firstName + ' ' + lastName).trim() || userProfile?.email || '';
  const primaryRole  = userRoles[0] ?? '';

  const pid = selectedProject?.id;

  const projectDocs  = qcDocuments.filter(d => d.projectId === pid);
  const projectItps  = itpItems.filter(d => d.projectId === pid);
  const projectRfis  = rfiItems.filter(d => d.projectId === pid);
  const projectMats  = materials.filter(d => d.projectId === pid);
  const projectNcrs  = ncrItems.filter(d => d.projectId === pid);
  const projectPunch = punchlist.filter(d => d.projectId === pid);

  const passedRfi  = projectRfis.filter(r => r.result === 'Pass' || r.stage4Result === 'Pass').length;
  const openPunch  = projectPunch.filter(p => p.inspectionStatus !== 'close').length;
  const closedPunch = projectPunch.filter(p => p.inspectionStatus === 'close').length;
  const openNcr    = projectNcrs.filter(n => n.status !== 'Close').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{selectedProject?.name || 'No Project Selected'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedProject?.projectNo} · {selectedProject?.location}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Logged in as</div>
          <div className="text-sm font-semibold text-slate-800">{displayName}</div>
          {primaryRole && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[primaryRole] ?? 'bg-slate-100 text-slate-700'}`}>
              {ROLE_LABELS[primaryRole] ?? primaryRole}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}     label="QC Documents"   value={projectDocs.length}  sub="Transmittals received"      color="text-blue-600"   bgColor="bg-blue-50" />
        <StatCard icon={ClipboardList} label="ITP Items"      value={projectItps.length}  sub="Inspection test plans"      color="text-purple-600" bgColor="bg-purple-50" />
        <StatCard icon={AlertTriangle} label="RFI Requests"   value={projectRfis.length}  sub={`${passedRfi} passed`}      color="text-orange-600" bgColor="bg-orange-50" />
        <StatCard icon={PackageCheck}  label="Materials"      value={projectMats.length}  sub="Material receive records"   color="text-teal-600"   bgColor="bg-teal-50" />
        <StatCard icon={AlertTriangle} label="Open NCRs"      value={openNcr}             sub={`${projectNcrs.length} total`} color="text-red-600" bgColor="bg-red-50" />
        <StatCard icon={ListChecks}    label="Open Punch"     value={openPunch}           sub={`${closedPunch} closed`}    color="text-amber-600"  bgColor="bg-amber-50" />
        <StatCard icon={CheckCircle2}  label="Closed Punch"   value={closedPunch}         sub="Ready for handover"         color="text-green-600"  bgColor="bg-green-50" />
        <StatCard icon={TrendingUp}    label="Project Status" value={selectedProject?.status || '—'} sub={`PM: ${selectedProject?.pm}`} color="text-slate-600" bgColor="bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent RFIs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent RFI Activity</h3>
            <span className="text-[11px] text-slate-400">{selectedProject?.name}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {projectRfis.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-400">No RFI records for this project</div>
            )}
            {projectRfis.slice(0, 5).map(rfi => (
              <div key={rfi.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{rfi.rfiNo}</div>
                  <div className="text-[11px] text-slate-500 truncate">{rfi.typeOfInspection} · {rfi.area}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    Stage {rfi.stage}
                  </span>
                  <StatusBadge status={rfi.statusInsp || 'Pending'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Punch List Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Punch List Status</h3>
            <span className="text-[11px] text-slate-400">{selectedProject?.name}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {projectPunch.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-400">No punch list items for this project</div>
            )}
            {projectPunch.slice(0, 5).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{p.punchNo}</div>
                  <div className="text-[11px] text-slate-500 truncate">{p.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    p.categoryLegend === 'A' ? 'bg-red-100 text-red-700' :
                    p.categoryLegend === 'B' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'}`}>
                    Cat {p.categoryLegend}
                  </span>
                  <StatusBadge status={p.inspectionStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Projects Overview - visible to Exec roles */}
      {(userRoles.some(r => ['MasterAdmin','SuperAdmin','Admin','MD','CD','PM'].includes(r))) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">All Projects Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {['Project No.', 'Name', 'Location', 'PM', 'Start', 'Finish', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleProjects.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{p.projectNo}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{p.location}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{p.pm}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{p.startDate}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{p.finishDate}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
