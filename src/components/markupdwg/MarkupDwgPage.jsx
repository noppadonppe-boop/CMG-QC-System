import { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import {
  Upload, FileText, Edit2, Save, X, Loader2,
  Trash2, ArrowUp, ArrowDown, RefreshCw, ZoomIn, ZoomOut,
} from 'lucide-react';
import { storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { useApp } from '../../context/AppContext';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function createId(prefix = 'markup-page') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFileExtension(name = '', fallback = 'png') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext || fallback;
}

function PageCard({ page, index, isEditMode, onMoveUp, onMoveDown, onDelete, onReplace, totalPages, zoom }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">Page {index + 1}</div>
          <div className="text-[11px] text-slate-500 truncate">{page.name || `Page ${index + 1}`}</div>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              title="Move up"
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalPages - 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              title="Move down"
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              onClick={onReplace}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              title="Replace image"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
              title="Delete page"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-100 p-4">
        <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-2">
          <div
            className="mx-auto"
            style={{
              width: `${zoom}%`,
            }}
          >
            <img
              src={page.url}
              alt={page.name || `Page ${index + 1}`}
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarkupDwgPage() {
  const { selectedProject, markupDwgItems, addMarkupDwg, updateMarkupDwg } = useApp();
  const { canAction } = useMenuPermissions();
  const canEdit = canAction('markup-dwg', 'editMarkup');
  const canSave = canAction('markup-dwg', 'saveMarkup');

  const pdfInputRef = useRef(null);
  const addPdfInputRef = useRef(null);
  const replaceImageInputRef = useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [busyProgress, setBusyProgress] = useState(0);
  const [draftPages, setDraftPages] = useState([]);
  const [replaceTargetId, setReplaceTargetId] = useState('');
  const [zoom, setZoom] = useState(100);

  const currentMarkup = useMemo(() => {
    if (!selectedProject) return null;
    return markupDwgItems.find(item => item.id === selectedProject.id || item.projectId === selectedProject.id) || null;
  }, [markupDwgItems, selectedProject]);

  useEffect(() => {
    if (!isEditMode) {
      setDraftPages(currentMarkup?.pages || []);
    }
  }, [currentMarkup, isEditMode]);

  async function uploadBlob(blob, path, onProgress) {
    const ref = storageRef(storage, path);
    const task = uploadBytesResumable(ref, blob);

    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => {
          if (!onProgress) return;
          const progress = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress(progress);
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        },
      );
    });
  }

  async function saveMarkupRecord(payload) {
    if (!selectedProject) return;
    const base = {
      id: selectedProject.id,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      ...payload,
    };

    if (currentMarkup) {
      await updateMarkupDwg(selectedProject.id, base);
    } else {
      await addMarkupDwg(base);
    }
  }

  async function convertPdfToPages(pdfFile) {
    if (!selectedProject) return [];

    const data = new Uint8Array(await pdfFile.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      setBusyLabel(`Converting PDF page ${i}/${pdf.numPages}`);
      setBusyProgress(Math.round((i / pdf.numPages) * 100));

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error('Unable to render PDF page.'));
        }, 'image/png', 0.95);
      });

      const safeName = pdfFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
      const imagePath = `markup-dwg/${selectedProject.id}/pages/${safeName}-${String(i).padStart(2, '0')}-${Date.now()}.png`;
      const imageUrl = await uploadBlob(blob, imagePath);

      pages.push({
        id: createId(),
        name: `${pdfFile.name} - Page ${i}`,
        url: imageUrl,
        order: i - 1,
      });
    }

    return pages;
  }

  async function handlePdfUpload(file) {
    if (!file || !selectedProject) return;

    try {
      setBusyLabel('Uploading original PDF');
      setBusyProgress(0);

      const pdfPath = `markup-dwg/${selectedProject.id}/source/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9-_.]/g, '-')}`;
      const pdfUrl = await uploadBlob(file, pdfPath, setBusyProgress);

      const pages = await convertPdfToPages(file);
      await saveMarkupRecord({
        sourceFileName: file.name,
        sourcePdfUrl: pdfUrl,
        pages,
      });

      setDraftPages(pages);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to upload PDF:', error);
      alert('Failed to upload and convert PDF.');
    } finally {
      setBusyLabel('');
      setBusyProgress(0);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  }

  async function handleAddPdf(file) {
    if (!file) return;

    try {
      const convertedPages = await convertPdfToPages(file);
      const newPages = convertedPages.map((page, index) => ({
        ...page,
        order: draftPages.length + index,
      }));
      setDraftPages(prev => [...prev, ...newPages]);
    } catch (error) {
      console.error('Failed to add PDF pages:', error);
      alert('Failed to add PDF.');
    } finally {
      setBusyLabel('');
      setBusyProgress(0);
      if (addPdfInputRef.current) addPdfInputRef.current.value = '';
    }
  }

  async function handleReplaceImage(file) {
    if (!file || !replaceTargetId || !selectedProject) return;

    try {
      setBusyLabel('Replacing page image');
      setBusyProgress(0);

      const ext = getFileExtension(file.name, 'png');
      const path = `markup-dwg/${selectedProject.id}/manual/${Date.now()}-replace.${ext}`;
      const url = await uploadBlob(file, path, setBusyProgress);

      setDraftPages(prev => prev.map(page => (
        page.id === replaceTargetId
          ? { ...page, url, name: file.name }
          : page
      )));
    } catch (error) {
      console.error('Failed to replace image:', error);
      alert('Failed to replace image.');
    } finally {
      setBusyLabel('');
      setBusyProgress(0);
      setReplaceTargetId('');
      if (replaceImageInputRef.current) replaceImageInputRef.current.value = '';
    }
  }

  function beginEdit() {
    setDraftPages(currentMarkup?.pages || []);
    setIsEditMode(true);
  }

  function cancelEdit() {
    setDraftPages(currentMarkup?.pages || []);
    setIsEditMode(false);
  }

  function movePage(index, direction) {
    setDraftPages(prev => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function deletePage(pageId) {
    setDraftPages(prev => prev.filter(page => page.id !== pageId));
  }

  async function saveDraftPages() {
    if (!selectedProject || !canSave) return;

    try {
      setBusyLabel('Saving markup pages');
      setBusyProgress(100);

      await saveMarkupRecord({
        sourceFileName: currentMarkup?.sourceFileName || 'Markup Pages',
        sourcePdfUrl: currentMarkup?.sourcePdfUrl || '',
        pages: draftPages.map((page, index) => ({
          ...page,
          order: index,
        })),
      });

      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save markup pages:', error);
      alert('Failed to save markup pages.');
    } finally {
      setBusyLabel('');
      setBusyProgress(0);
    }
  }

  const visiblePages = isEditMode ? draftPages : (currentMarkup?.pages || []);

  function zoomOut() {
    setZoom(prev => Math.max(0, prev - 10));
  }

  function zoomIn() {
    setZoom(prev => Math.min(999, prev + 10));
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-800">Markup DWG</h1>
              {currentMarkup?.sourceFileName && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={16} />
                  <span className="truncate">{currentMarkup.sourceFileName}</span>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Upload PDF, convert each page to image, and keep this layout as the default view for everyone in the project.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!!visiblePages.length && (
              <div className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  title="Zoom out"
                >
                  <ZoomOut size={15} />
                </button>
                <div className="min-w-[52px] text-center text-sm font-semibold text-slate-700">{zoom}%</div>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  title="Zoom in"
                >
                  <ZoomIn size={15} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={!!busyLabel}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {busyLabel ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {currentMarkup ? 'Replace PDF' : 'Upload PDF'}
            </button>

            {!!currentMarkup && !isEditMode && canEdit && (
              <button
                type="button"
                onClick={beginEdit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
              >
                <Edit2 size={16} />
                Edit
              </button>
            )}

            {isEditMode && (
              <>
                <button
                  type="button"
                  onClick={() => addPdfInputRef.current?.click()}
                  disabled={!!busyLabel}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileText size={16} />
                  Add PDF
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
                >
                  <X size={16} />
                  Cancel
                </button>
                {canSave && (
                  <button
                    type="button"
                    onClick={saveDraftPages}
                    disabled={!!busyLabel}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                  >
                    <Save size={16} />
                    Save
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {!!busyLabel && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Loader2 size={16} className="animate-spin" />
              {busyLabel}
            </div>
            <div className="mt-2 h-2 rounded-full bg-orange-100">
              <div
                className="h-2 rounded-full bg-orange-500 transition-all"
                style={{ width: `${busyProgress}%` }}
              />
            </div>
          </div>
        )}

        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePdfUpload(file);
          }}
          className="hidden"
        />
        <input
          ref={addPdfInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAddPdf(file);
          }}
          className="hidden"
        />
        <input
          ref={replaceImageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReplaceImage(file);
          }}
          className="hidden"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!visiblePages.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">No markup pages yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Upload a PDF and this page will convert it into image pages, save it as the default project view,
                and show the pages here every time someone opens Markup DWG.
              </p>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                <Upload size={16} />
                Upload PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-5">
            {visiblePages
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((page, index, pages) => (
                <PageCard
                  key={page.id}
                  page={page}
                  index={index}
                  totalPages={pages.length}
                  isEditMode={isEditMode}
                  onMoveUp={() => movePage(index, -1)}
                  onMoveDown={() => movePage(index, 1)}
                  onDelete={() => deletePage(page.id)}
                  onReplace={() => {
                    setReplaceTargetId(page.id);
                    replaceImageInputRef.current?.click();
                  }}
                  zoom={zoom}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
