import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import TableColumnVisibility from '../common/TableColumnVisibility';
import TagManagementModal from './TagManagementModal';

const TAG_TABLE_COLUMNS = [
  { key: 'row', label: '#' },
  { key: 'tagId', label: 'TAG ID' },
  { key: 'createdAt', label: 'Created At' },
];

function formatDate(value) {
  const date = value?.toDate?.() ?? (value instanceof Date ? value : null);
  if (!date) return '-';
  return date.toLocaleString('th-TH');
}

export default function TagManagementTab() {
  const {
    finalPackage,
    addFinalPackage,
    selectedProjectId,
    selectedProject,
  } = useApp();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const rows = useMemo(() => (
    (finalPackage || [])
      .filter(item => item.projectId === selectedProjectId && item.recordType === 'tag-management')
      .sort((a, b) => String(a.tagId || '').localeCompare(String(b.tagId || ''), undefined, { numeric: true, sensitivity: 'base' }))
  ), [finalPackage, selectedProjectId]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row => String(row.tagId || '').toLowerCase().includes(query));
  }, [rows, search]);

  function handleCreate({ tagId }) {
    addFinalPackage({
      projectId: selectedProjectId,
      recordType: 'tag-management',
      tagId,
    });
    setShowCreateModal(false);
  }

  return (
    <>
      {showCreateModal && (
        <TagManagementModal
          existingTagIds={rows.map(row => row.tagId)}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">TAG Management</h2>
            <p className="mt-0.5 text-sm text-slate-500">{selectedProject?.name} - TAG table view</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <Plus size={14} />
            Create TAG
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Search TAG ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-red-500"
            >
              <X size={13} /> Clear
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-500">{filteredRows.length} tags</span>
        </div>

        <TableColumnVisibility
          storageKey={`tag-management-table-columns:${selectedProjectId || 'all'}`}
          tableId="tag-management-table"
          columns={TAG_TABLE_COLUMNS}
          className="overflow-hidden rounded-xl border border-slate-100 bg-white p-4 pt-3 shadow-sm"
        >
          <div className="overflow-x-auto">
            <table data-column-table="tag-management-table" className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {TAG_TABLE_COLUMNS.map(col => (
                    <th key={col.key} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold tracking-wide">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={TAG_TABLE_COLUMNS.length} className="px-4 py-12 text-center text-slate-400">
                      No TAG records in <span className="font-semibold">{selectedProject?.name}</span>.
                    </td>
                  </tr>
                )}
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{row.tagId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TableColumnVisibility>
      </div>
    </>
  );
}
