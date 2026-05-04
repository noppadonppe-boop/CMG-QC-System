import { useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import {
  Upload, FileText, Edit2, Save, X, Loader2,
  Trash2, ArrowUp, ArrowDown, RefreshCw, ZoomIn, ZoomOut, Plus, Building2,
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
  const [activeBuilding, setActiveBuilding] = useState('');
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  const currentMarkup = useMemo(() => {
    if (!selectedProject) return null;
    return markupDwgItems.find(item => item.id === selectedProject.id || item.projectId === selectedProject.id) || null;
  }, [markupDwgItems, selectedProject]);

  const buildings = useMemo(() => {
    return currentMarkup?.buildings || [];
  }, [currentMarkup]);

  useEffect(() => {
    if (!isEditMode) {
      const currentBuilding = buildings.find(b => b.id === activeBuilding);
      setDraftPages(currentBuilding?.pages || []);
    }
  }, [currentMarkup, isEditMode, activeBuilding, buildings]);

  useEffect(() => {
    if (buildings.length > 0 && !activeBuilding) {
      setActiveBuilding(buildings[0].id);
    }
  }, [buildings, activeBuilding]);

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

  async function createBuilding() {
    if (!newBuildingName.trim() || !selectedProject) return;
    
    const newBuilding = {
      id: createId('building'),
      name: newBuildingName.trim(),
      pages: [],
      createdAt: new Date().toISOString(),
    };

    const updatedBuildings = [...buildings, newBuilding];
    
    await saveMarkupRecord({
      buildings: updatedBuildings,
    });

    setActiveBuilding(newBuilding.id);
    setNewBuildingName('');
    setShowBuildingModal(false);
  }

  async function deleteBuilding(buildingId) {
    if (!window.confirm('ต้องการลบอาคารนี้และไฟล์ทั้งหมดหรือไม่?')) return;
    
    const updatedBuildings = buildings.filter(b => b.id !== buildingId);
    
    await saveMarkupRecord({
      buildings: updatedBuildings,
    });

    if (activeBuilding === buildingId && updatedBuildings.length > 0) {
      setActiveBuilding(updatedBuildings[0].id);
    }
  }

  async function renameBuildingPrompt(building) {
    const newName = window.prompt('ชื่ออาคารใหม่:', building.name);
    if (!newName || newName.trim() === building.name) return;

    const updatedBuildings = buildings.map(b => 
      b.id === building.id ? { ...b, name: newName.trim() } : b
    );

    await saveMarkupRecord({
      buildings: updatedBuildings,
    });
  }

  async function convertPdfToPages(pdfFile) {
    if (!selectedProject || !activeBuilding) return [];

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
      const imagePath = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/pages/${safeName}-${String(i).padStart(2, '0')}-${Date.now()}.png`;
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
    if (!file || !selectedProject || !activeBuilding) return;

    try {
      setBusyLabel('Uploading original PDF');
      setBusyProgress(0);

      const pdfPath = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9-_.]/g, '-')}`;
      const pdfUrl = await uploadBlob(file, pdfPath, setBusyProgress);

      const pages = await convertPdfToPages(file);
      
      const updatedBuildings = buildings.map(b => 
        b.id === activeBuilding 
          ? { ...b, sourceFileName: file.name, sourcePdfUrl: pdfUrl, pages }
          : b
      );

      await saveMarkupRecord({
        buildings: updatedBuildings,
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
    if (!file || !replaceTargetId || !selectedProject || !activeBuilding) return;

    try {
      setBusyLabel('Replacing page image');
      setBusyProgress(0);

      const ext = getFileExtension(file.name, 'png');
      const path = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/manual/${Date.now()}-replace.${ext}`;
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
    const currentBuilding = buildings.find(b => b.id === activeBuilding);
    setDraftPages(currentBuilding?.pages || []);
    setIsEditMode(true);
  }

  function cancelEdit() {
    const currentBuilding = buildings.find(b => b.id === activeBuilding);
    setDraftPages(currentBuilding?.pages || []);
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
    if (!selectedProject || !canSave || !activeBuilding) return;

    try {
      setBusyLabel('Saving markup pages');
      setBusyProgress(100);

      const currentBuilding = buildings.find(b => b.id === activeBuilding);
      const updatedBuildings = buildings.map(b => 
        b.id === activeBuilding 
          ? {
              ...b,
              sourceFileName: currentBuilding?.sourceFileName || 'Markup Pages',
              sourcePdfUrl: currentBuilding?.sourcePdfUrl || '',
              pages: draftPages.map((page, index) => ({
                ...page,
                order: index,
              })),
            }
          : b
      );

      await saveMarkupRecord({
        buildings: updatedBuildings,
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

  const currentBuilding = buildings.find(b => b.id === activeBuilding);
  const visiblePages = isEditMode ? draftPages : (currentBuilding?.pages || []);

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
              <h1 className="text-lg font-bold text-slate-800">Markup RFI</h1>
              {currentBuilding?.sourceFileName && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={16} />
                  <span className="truncate">{currentBuilding.sourceFileName}</span>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              จัดการไฟล์ Markup RFI แยกตามอาคาร อัพโหลด PDF และแปลงเป็นรูปภาพแต่ละหน้า
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBuildingModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600"
            >
              <Plus size={16} />
              สร้างอาคาร
            </button>

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
              disabled={!!busyLabel || !activeBuilding}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {busyLabel ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {currentBuilding?.pages?.length ? 'Replace PDF' : 'Upload PDF'}
            </button>

            {!!currentBuilding && !isEditMode && canEdit && (
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

      {/* Building Modal */}
      {showBuildingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBuildingModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Building2 size={18} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">สร้างอาคารใหม่</h3>
                <p className="text-xs text-slate-500 mt-0.5">กรอกชื่ออาคารเพื่อเริ่มต้น</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">ชื่ออาคาร</label>
              <input
                type="text"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="เช่น อาคาร A, Building 1, โรงงาน 1"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBuildingName.trim()) {
                    createBuilding();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBuildingModal(false);
                  setNewBuildingName('');
                }}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={createBuilding}
                disabled={!newBuildingName.trim()}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                สร้างอาคาร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Building Tabs */}
      {buildings.length > 0 && (
        <div className="border-b border-slate-200 bg-white px-5">
          <div className="flex items-center gap-2 overflow-x-auto">
            {buildings.map(building => (
              <div key={building.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setActiveBuilding(building.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeBuilding === building.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={16} />
                  {building.name}
                  {building.pages?.length > 0 && (
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {building.pages.length}
                    </span>
                  )}
                </button>
                {canEdit && (
                  <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameBuildingPrompt(building);
                      }}
                      className="rounded bg-blue-500 p-1 text-white hover:bg-blue-600"
                      title="เปลี่ยนชื่อ"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBuilding(building.id);
                      }}
                      className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
                      title="ลบอาคาร"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {buildings.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <Building2 size={48} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">ยังไม่มีอาคาร</h2>
              <p className="mt-2 text-sm text-slate-500">
                เริ่มต้นด้วยการสร้างอาคารใหม่ จากนั้นอัพโหลด PDF เพื่อแปลงเป็นรูปภาพแต่ละหน้า
              </p>
              <button
                type="button"
                onClick={() => setShowBuildingModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-600"
              >
                <Plus size={16} />
                สร้างอาคารแรก
              </button>
            </div>
          </div>
        ) : !visiblePages.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">ยังไม่มีไฟล์ในอาคารนี้</h2>
              <p className="mt-2 text-sm text-slate-500">
                อัพโหลด PDF และระบบจะแปลงเป็นรูปภาพแต่ละหน้าสำหรับอาคาร {currentBuilding?.name}
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
