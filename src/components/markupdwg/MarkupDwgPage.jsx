import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Upload, FileText, Edit2, Save, X, Loader2,
  Trash2, ArrowUp, ArrowDown, RefreshCw, ZoomIn, ZoomOut, Plus, Building2, Folder, FolderPlus
} from 'lucide-react';
import { storage } from '../../config/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useMenuPermissions } from '../../auth/useMenuPermissions';
import { useApp } from '../../context/AppContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function createId(prefix = 'markup-page') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getFileExtension(name = '', fallback = 'png') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext || fallback;
}

function getBaseFileName(name = '') {
  return name.replace(/\.[^.]+$/, '');
}

function sortPagesByOrder(pages = []) {
  return [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function buildPageName(pageTitle, fileName, pageNumber, totalPages) {
  const fallbackTitle = getBaseFileName(fileName) || 'Markup Page';
  const resolvedTitle = pageTitle?.trim() || fallbackTitle;
  if (totalPages <= 1) return resolvedTitle;
  return `${resolvedTitle} - Page ${pageNumber}`;
}

function isPdfFile(file) {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

function formatPageDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function PageCard({ page, index, isEditMode, onMoveUp, onMoveDown, onDelete, onReplace, totalPages, zoom }) {
  const pageLabel = formatPageDate(page.createdAt) || `Page ${index + 1}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">{page.name || `Page ${index + 1}`}</div>
          <div className="text-[11px] text-slate-500">Upload Date: {pageLabel}</div>
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

  const uploadFileInputRef = useRef(null);
  const replaceImageInputRef = useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [busyProgress, setBusyProgress] = useState(0);
  const [draftPages, setDraftPages] = useState([]);
  const [draftSourceFileName, setDraftSourceFileName] = useState('');
  const [draftSourcePdfUrl, setDraftSourcePdfUrl] = useState('');
  const [replaceTargetId, setReplaceTargetId] = useState('');
  const [zoom, setZoom] = useState(100);
  const [activeBuilding, setActiveBuilding] = useState('');
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  
  const [activeGroup, setActiveGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPageName, setUploadPageName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const currentMarkup = useMemo(() => {
    if (!selectedProject) return null;
    return markupDwgItems.find(item => item.id === selectedProject.id || item.projectId === selectedProject.id) || null;
  }, [markupDwgItems, selectedProject]);

  const buildings = useMemo(() => {
    const rawBuildings = currentMarkup?.buildings || [];
    return rawBuildings.map(b => {
      if (b.groups) return b;
      return {
        ...b,
        groups: [
          {
            id: b.id + '-default',
            name: 'General',
            pages: b.pages || [],
            sourceFileName: b.sourceFileName || '',
            sourcePdfUrl: b.sourcePdfUrl || ''
          }
        ]
      };
    });
  }, [currentMarkup]);

  const currentBuilding = buildings.find(b => b.id === activeBuilding);
  const groups = currentBuilding?.groups || [];
  const currentGroup = groups.find(g => g.id === activeGroup);

  useEffect(() => {
    if (!isEditMode) {
      setDraftPages(sortPagesByOrder(currentGroup?.pages || []));
      setDraftSourceFileName(currentGroup?.sourceFileName || '');
      setDraftSourcePdfUrl(currentGroup?.sourcePdfUrl || '');
    }
  }, [currentMarkup, isEditMode, activeGroup, currentGroup]);

  useEffect(() => {
    if (buildings.length > 0 && !activeBuilding) {
      setActiveBuilding(buildings[0].id);
    }
  }, [buildings, activeBuilding]);

  useEffect(() => {
    if (groups.length > 0 && (!activeGroup || !groups.find(g => g.id === activeGroup))) {
      setActiveGroup(groups[0].id);
    } else if (groups.length === 0) {
      setActiveGroup('');
    }
  }, [groups, activeGroup]);

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
      groups: [],
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

  async function createGroup() {
    if (!newGroupName.trim() || !selectedProject || !activeBuilding) return;
    
    const newGroup = {
      id: createId('group'),
      name: newGroupName.trim(),
      pages: [],
      createdAt: new Date().toISOString(),
    };

    const updatedBuildings = buildings.map(b => {
      if (b.id === activeBuilding) {
        return {
          ...b,
          groups: [...(b.groups || []), newGroup]
        };
      }
      return b;
    });
    
    await saveMarkupRecord({
      buildings: updatedBuildings,
    });

    setActiveGroup(newGroup.id);
    setNewGroupName('');
    setShowGroupModal(false);
  }

  async function deleteGroup(groupId) {
    if (!window.confirm('ต้องการลบกลุ่มนี้และไฟล์ทั้งหมดหรือไม่?')) return;
    
    const updatedBuildings = buildings.map(b => {
      if (b.id === activeBuilding) {
        return {
          ...b,
          groups: b.groups.filter(g => g.id !== groupId)
        };
      }
      return b;
    });
    
    await saveMarkupRecord({
      buildings: updatedBuildings,
    });
  }

  async function renameGroupPrompt(group) {
    const newName = window.prompt('ชื่อกลุ่มใหม่:', group.name);
    if (!newName || newName.trim() === group.name) return;

    const updatedBuildings = buildings.map(b => {
      if (b.id === activeBuilding) {
        return {
          ...b,
          groups: b.groups.map(g => g.id === group.id ? { ...g, name: newName.trim() } : g)
        };
      }
      return b;
    });

    await saveMarkupRecord({
      buildings: updatedBuildings,
    });
  }

  async function convertPdfToPages(pdfFile) {
    if (!selectedProject || !activeBuilding || !activeGroup) return [];

    const data = new Uint8Array(await pdfFile.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ 
      data,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    }).promise;
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
      const imagePath = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/groups/${activeGroup}/pages/${safeName}-${String(i).padStart(2, '0')}-${Date.now()}.png`;
      const imageUrl = await uploadBlob(blob, imagePath);

      pages.push({
        id: createId(),
        name: buildPageName(uploadPageName, pdfFile.name, i, pdf.numPages),
        url: imageUrl,
        order: i - 1,
        createdAt: new Date().toISOString(),
      });
    }

    return pages;
  }

  async function convertImageToPage(file) {
    if (!selectedProject || !activeBuilding || !activeGroup) return [];

    setBusyLabel('Uploading page image');
    setBusyProgress(0);

    const ext = getFileExtension(file.name, 'png');
    const safeName = getBaseFileName(file.name).replace(/[^a-zA-Z0-9-_]/g, '-');
    const imagePath = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/groups/${activeGroup}/manual/${safeName}-${Date.now()}.${ext}`;
    const imageUrl = await uploadBlob(file, imagePath, setBusyProgress);

    return [
      {
        id: createId(),
        name: buildPageName(uploadPageName, file.name, 1, 1),
        url: imageUrl,
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async function createPagesFromFile(file) {
    if (!file) return [];
    if (isPdfFile(file)) {
      return convertPdfToPages(file);
    }
    return convertImageToPage(file);
  }

  function prependPages(existingPages, newPages) {
    return [...newPages, ...sortPagesByOrder(existingPages)].map((page, index) => ({
      ...page,
      order: index,
    }));
  }

  function openUploadModal() {
    if (!activeBuilding || !activeGroup || busyLabel) return;
    setUploadPageName('');
    setUploadFile(null);
    setShowUploadModal(true);
  }

  function closeUploadModal() {
    setShowUploadModal(false);
    setUploadPageName('');
    setUploadFile(null);
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
  }

  async function handleUploadSubmit() {
    if (!uploadFile || !selectedProject || !activeBuilding || !activeGroup) return;

    try {
      const file = uploadFile;
      const isPdfUpload = isPdfFile(file);
      let uploadedFileUrl = '';

      if (isPdfUpload) {
        setBusyLabel('Uploading original PDF');
        setBusyProgress(0);

        const pdfPath = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/groups/${activeGroup}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9-_.]/g, '-')}`;
        uploadedFileUrl = await uploadBlob(file, pdfPath, setBusyProgress);
      }

      const newPages = await createPagesFromFile(file);

      if (isEditMode) {
        setDraftPages(prev => prependPages(prev, newPages));
        setDraftSourceFileName(file.name);
        setDraftSourcePdfUrl(isPdfUpload ? uploadedFileUrl : '');
      } else {
        const updatedBuildings = buildings.map((building) => {
          if (building.id !== activeBuilding) return building;
          return {
            ...building,
            groups: building.groups.map((group) => {
              if (group.id !== activeGroup) return group;
              return {
                ...group,
                sourceFileName: file.name,
                sourcePdfUrl: isPdfUpload ? uploadedFileUrl : '',
                pages: prependPages(group.pages || [], newPages),
                updatedAt: new Date().toISOString(),
              };
            }),
          };
        });

        await saveMarkupRecord({
          buildings: updatedBuildings,
        });
      }

      closeUploadModal();
    } catch (error) {
      console.error('Failed to upload markup file:', error);
      alert(`Failed to upload and create markup pages. Error: ${error?.message || error}`);
    } finally {
      setBusyLabel('');
      setBusyProgress(0);
    }
  }

  async function handleReplaceImage(file) {
    if (!file || !replaceTargetId || !selectedProject || !activeBuilding || !activeGroup) return;

    try {
      setBusyLabel('Replacing page image');
      setBusyProgress(0);

      const ext = getFileExtension(file.name, 'png');
      const path = `markup-dwg/${selectedProject.id}/buildings/${activeBuilding}/groups/${activeGroup}/manual/${Date.now()}-replace.${ext}`;
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
    setDraftPages(sortPagesByOrder(currentGroup?.pages || []));
    setDraftSourceFileName(currentGroup?.sourceFileName || '');
    setDraftSourcePdfUrl(currentGroup?.sourcePdfUrl || '');
    setIsEditMode(true);
  }

  function cancelEdit() {
    setDraftPages(sortPagesByOrder(currentGroup?.pages || []));
    setDraftSourceFileName(currentGroup?.sourceFileName || '');
    setDraftSourcePdfUrl(currentGroup?.sourcePdfUrl || '');
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
    if (!selectedProject || !canSave || !activeBuilding || !activeGroup) return;

    try {
      setBusyLabel('Saving markup pages');
      setBusyProgress(100);

      const updatedBuildings = buildings.map(b => {
        if (b.id === activeBuilding) {
          return {
            ...b,
            groups: b.groups.map(g => {
              if (g.id === activeGroup) {
                return {
                  ...g,
                  sourceFileName: draftSourceFileName || currentGroup?.sourceFileName || 'Markup Pages',
                  sourcePdfUrl: draftSourcePdfUrl || '',
                  pages: draftPages.map((page, index) => ({
                    ...page,
                    order: index,
                  }))
                };
              }
              return g;
            })
          };
        }
        return b;
      });

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

  const visiblePages = sortPagesByOrder(isEditMode ? draftPages : (currentGroup?.pages || []));

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
              {(isEditMode ? draftSourceFileName : currentGroup?.sourceFileName) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText size={16} />
                  <span className="truncate">{isEditMode ? draftSourceFileName : currentGroup?.sourceFileName}</span>
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
              onClick={openUploadModal}
              disabled={!!busyLabel || !activeBuilding || !activeGroup}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {busyLabel ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {currentGroup?.pages?.length ? 'Add File' : 'Upload File'}
            </button>

            {!!currentGroup && !isEditMode && canEdit && (
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
                  onClick={openUploadModal}
                  disabled={!!busyLabel}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <FileText size={16} />
                  Add File
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
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeUploadModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                <Upload size={18} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Upload file to folder</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Set a page name first, then upload PDF or image to add new pages on top of this folder.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">Page Name</label>
                <input
                  type="text"
                  value={uploadPageName}
                  onChange={(e) => setUploadPageName(e.target.value)}
                  placeholder="e.g. Pile Cut Off Update 16.05.2026"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">File</label>
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file && !uploadPageName.trim()) {
                      setUploadPageName(getBaseFileName(file.name));
                    }
                  }}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-600 hover:file:bg-orange-100"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Supports PDF, JPG, PNG and WEBP. New pages will always be placed above older pages.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeUploadModal}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!uploadFile || !uploadPageName.trim() || !!busyLabel}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGroupModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FolderPlus size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">สร้างกลุ่มใหม่</h3>
                <p className="text-xs text-slate-500 mt-0.5">กรอกชื่อกลุ่มเพื่อแบ่งหมวดหมู่</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">ชื่อกลุ่ม</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="เช่น Architectural, Structural, MEP"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim()) {
                    createGroup();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setNewGroupName('');
                }}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                สร้างกลุ่ม
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
                  {building.groups?.length > 0 && (
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {building.groups.length}
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

      {/* Group Tabs */}
      {buildings.length > 0 && activeBuilding && (
        <div className="border-b border-slate-100 bg-slate-50/50 px-5">
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            <button
              type="button"
              onClick={() => setShowGroupModal(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-100"
            >
              <FolderPlus size={14} />
              สร้างกลุ่ม
            </button>
            
            {groups.length > 0 && <div className="mx-1 h-4 w-px bg-slate-300" />}

            {groups.map(group => (
              <div key={group.id} className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveGroup(group.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeGroup === group.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  } border ${
                    activeGroup === group.id ? 'border-blue-200' : 'border-slate-200'
                  }`}
                >
                  <Folder size={14} />
                  {group.name}
                  {group.pages?.length > 0 && (
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                      activeGroup === group.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {group.pages.length}
                    </span>
                  )}
                </button>
                {canEdit && (
                  <div className="absolute -right-1 -top-1 hidden gap-1 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        renameGroupPrompt(group);
                      }}
                      className="rounded-full bg-blue-500 p-1 text-white shadow-sm hover:bg-blue-600"
                      title="เปลี่ยนชื่อกลุ่ม"
                    >
                      <Edit2 size={8} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(group.id);
                      }}
                      className="rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
                      title="ลบกลุ่ม"
                    >
                      <Trash2 size={8} />
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
        ) : groups.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <Folder size={48} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">ยังไม่มีกลุ่มในอาคารนี้</h2>
              <p className="mt-2 text-sm text-slate-500">
                เริ่มต้นด้วยการสร้างกลุ่มเพื่อแยกหมวดหมู่เอกสาร เช่น โครงสร้าง, สถาปัตย์, งานระบบ
              </p>
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
              >
                <FolderPlus size={16} />
                สร้างกลุ่มแรก
              </button>
            </div>
          </div>
        ) : !visiblePages.length ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700">ยังไม่มีไฟล์ในกลุ่มนี้</h2>
              <p className="mt-2 text-sm text-slate-500">
                อัพโหลด PDF และระบบจะแปลงเป็นรูปภาพแต่ละหน้าสำหรับกลุ่ม {currentGroup?.name} ในอาคาร {currentBuilding?.name}
              </p>
              <button
                type="button"
                onClick={openUploadModal}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                <Upload size={16} />
                Upload File
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-5">
            {visiblePages
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
