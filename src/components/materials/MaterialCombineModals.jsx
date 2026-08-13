import { useMemo, useState } from 'react';
import { Check, ExternalLink, FileText, Layers3, Paperclip, Search } from 'lucide-react';
import Modal from '../common/Modal';

function getRfiNo(item) {
  return item?.rfiNo || item?.transmittalNoRef || '';
}

function DocumentFields({ document }) {
  const fields = [
    ['Transmittal No.', document.transmittalNo],
    ['MAP No.', document.documentNo],
    ['RFI No.', getRfiNo(document)],
    ['Revision', document.rev],
    ['Issue Date', document.receiveDate],
    ['Document Status', document.status],
  ];
  const attachedFiles = [];
  const seenUrls = new Set();

  function addFiles(files, fallbackName) {
    if (!Array.isArray(files)) return;
    files.forEach((file, index) => {
      const url = file?.url || file?.fileUrl;
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      attachedFiles.push({
        name: file?.name || file?.fileName || `${fallbackName} ${index + 1}`,
        url,
      });
    });
  }

  addFiles(document.attachments, 'Attachment');
  addFiles(document.docTitleFiles, 'Document');
  if (document.drawingLink && !seenUrls.has(document.drawingLink)) {
    attachedFiles.push({ name: 'Drawing Link', url: document.drawingLink });
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-slate-700" title={value || ''}>{value || '—'}</div>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Document Title</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-800">{document.documentTitle || '—'}</div>
      </div>
      <div className="col-span-2 border-t border-slate-200/70 pt-3 sm:col-span-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <Paperclip size={11} />
          Attached Files ({attachedFiles.length})
        </div>
        {attachedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map(file => (
              <a
                key={file.url}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                title={file.name}
                className="inline-flex max-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{file.name}</span>
                <ExternalLink size={11} className="shrink-0 text-blue-400" />
              </a>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">No attached files</span>
        )}
      </div>
    </div>
  );
}

export function MaterialCombineModal({ externalDocument, internalDocuments, onSave, onClose }) {
  const initialIds = useMemo(() => {
    const combinedIds = Array.isArray(externalDocument.combinedInternalIds)
      ? externalDocument.combinedInternalIds
      : [];
    const selectableIds = new Set(
      internalDocuments
        .filter(document => document.materialStatus !== 'Cancel')
        .map(document => document.id),
    );
    return combinedIds.filter(id => selectableIds.has(id));
  }, [externalDocument.combinedInternalIds, internalDocuments]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const activeDocuments = internalDocuments.filter(document => document.materialStatus !== 'Cancel');
    if (!keyword) return activeDocuments;
    return activeDocuments.filter(document => [
      document.transmittalNo,
      document.documentNo,
      getRfiNo(document),
      document.documentTitle,
      document.rev,
      document.status,
    ].some(value => String(value || '').toLowerCase().includes(keyword)));
  }, [internalDocuments, search]);

  const visibleIds = filteredDocuments.map(document => document.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  function toggle(id) {
    setSelectedIds(current => (
      current.includes(id) ? current.filter(itemId => itemId !== id) : [...current, id]
    ));
  }

  function toggleAllVisible() {
    setSelectedIds(current => {
      if (allVisibleSelected) return current.filter(id => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave(selectedIds);
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save combined materials.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={(
        <div>
          <h2 className="text-sm font-bold text-slate-800">Combine Internal Materials</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            External: <span className="font-semibold text-sky-700">{externalDocument.documentNo || externalDocument.transmittalNo || '—'}</span>
          </p>
        </div>
      )}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600">External Material</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">{externalDocument.documentTitle || '—'}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search internal materials..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-bold text-violet-700">
            {selectedIds.length} selected
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-[44vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-800 text-white">
                <tr>
                  <th className="w-12 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible internal materials"
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-semibold">TRANSMITTAL NO.</th>
                  <th className="px-3 py-3 text-left font-semibold">MAP NO.</th>
                  <th className="px-3 py-3 text-left font-semibold">DOCUMENT TITLE</th>
                  <th className="px-3 py-3 text-left font-semibold">REV</th>
                  <th className="px-3 py-3 text-left font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No internal materials found.</td>
                  </tr>
                )}
                {filteredDocuments.map(document => {
                  const selected = selectedIds.includes(document.id);
                  return (
                    <tr
                      key={document.id}
                      onClick={() => toggle(document.id)}
                      className={`cursor-pointer transition-colors ${selected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {selected && <Check size={11} />}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-teal-700">{document.transmittalNo || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-slate-600">{document.documentNo || '—'}</td>
                      <td className="max-w-72 px-3 py-3 font-medium text-slate-700">
                        <div className="truncate" title={document.documentTitle}>{document.documentTitle || '—'}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{document.rev || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{document.status || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            disabled={saving || selectedIds.length === 0}
            className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear selection
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              <Layers3 size={14} />
              {saving ? 'Saving...' : `Save Combine (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function MaterialCombinedDetailModal({ externalDocument, internalDocuments, onClose }) {
  const isCombined = Array.isArray(externalDocument.combinedInternalIds)
    && externalDocument.combinedInternalIds.length > 0;

  return (
    <Modal
      title={(
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Layers3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Combined Material Details</h2>
            <p className="text-[11px] text-slate-500">1 External · {internalDocuments.length} Internal</p>
          </div>
        </div>
      )}
      onClose={onClose}
      size="xl"
    >
      <div className="relative space-y-6">
        {isCombined && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-12 rounded-lg border-[5px] border-emerald-500/35 bg-white/10 px-6 py-2 text-5xl font-black tracking-[0.2em] text-emerald-500/30 sm:text-7xl">
              APPROVED
            </span>
          </div>
        )}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700">External Material</h3>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <DocumentFields document={externalDocument} />
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700">Combined Internal Materials</h3>
            </div>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">{internalDocuments.length} records</span>
          </div>

          {internalDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-400">
              No internal materials are combined with this external material.
            </div>
          ) : (
            <div className="space-y-3">
              {internalDocuments.map((document, index) => (
                <div key={document.id} className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 border-b border-violet-100 pb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-700">{index + 1}</span>
                    <FileText size={14} className="text-violet-500" />
                    <span className="text-xs font-bold text-slate-800">{document.documentNo || document.transmittalNo || 'Internal Material'}</span>
                  </div>
                  <DocumentFields document={document} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
