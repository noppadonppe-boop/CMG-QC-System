import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import TableColumnVisibility from '../common/TableColumnVisibility';

const FINAL_PACKAGE_STATUS_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'tagNo', label: 'Tag No.' },
  { key: 'rfiNo', label: 'RFI No.' },
];

function splitTagNo(rawTagNo) {
  return String(rawTagNo || '')
    .split(/[,\n;|]+/g)
    .map(v => v.trim())
    .filter(Boolean);
}

export default function FinalPackagePage() {
  const { rfiItems, selectedProjectId, selectedProject } = useApp();
  const [search, setSearch] = useState('');

  const projectRfis = useMemo(
    () => (rfiItems || []).filter(rfi => rfi.projectId === selectedProjectId),
    [rfiItems, selectedProjectId],
  );

  const rows = useMemo(() => {
    const result = [];

    projectRfis.forEach((rfi) => {
      const tags = splitTagNo(rfi.tagNo);
      tags.forEach((tag, tagIndex) => {
        result.push({
          id: `${rfi.id}-${tag}-${tagIndex}`,
          tagNo: tag,
          rfiNo: (rfi.rfiNo && rfi.rfiNo !== '-') ? rfi.rfiNo : (rfi.requestNo || '-'),
        });
      });
    });

    return result.sort((a, b) => {
      const byTag = a.tagNo.localeCompare(b.tagNo, undefined, { numeric: true, sensitivity: 'base' });
      if (byTag !== 0) return byTag;
      return a.rfiNo.localeCompare(b.rfiNo, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [projectRfis]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      row.tagNo.toLowerCase().includes(q) ||
      row.rfiNo.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Final Document Package</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedProject?.name} — Final Package Status</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-72 placeholder-slate-400 text-slate-700"
            placeholder="Search Tag No. / RFI No."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
        <span className="ml-auto text-[11px] text-slate-500">{filtered.length} tags</span>
      </div>

      <TableColumnVisibility
        storageKey="final-package-status-table-columns"
        tableId="final-package-status-table"
        columns={FINAL_PACKAGE_STATUS_COLUMNS}
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-4 pt-3"
      >
        <div className="overflow-x-auto">
          <table data-column-table="final-package-status-table" className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                {FINAL_PACKAGE_STATUS_COLUMNS.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-[11px] tracking-wide">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={FINAL_PACKAGE_STATUS_COLUMNS.length} className="px-4 py-12 text-center text-slate-400">
                    No tag records from RFI in <span className="font-semibold">{selectedProject?.name}</span>.
                  </td>
                </tr>
              )}
              {filtered.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{row.tagNo}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{row.rfiNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableColumnVisibility>
    </div>
  );
}
