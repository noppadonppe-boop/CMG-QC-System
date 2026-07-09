// @refresh reset
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  setItem,
  deleteItem,
  categories,
  subscribeCategory,
  updateItemSafe,
} from '../services/firestore';
import { useAuth } from '../auth/AuthContext';
import { ADMIN_ROLES } from '../auth/constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { firebaseUser, userProfile } = useAuth();

  const [dataLoaded,    setDataLoaded]    = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [projects,     setProjects]     = useState([]);
  const [tagOptions,   setTagOptions]   = useState([]);
  const [qcDocuments,  setQcDocuments]  = useState([]);
  const [itpItems,     setItpItems]     = useState([]);
  const [rfiItems,     setRfiItems]     = useState([]);
  const [materials,    setMaterials]    = useState([]);
  const [materialApprovals, setMaterialApprovals] = useState([]);
  const [ncrItems,     setNcrItems]     = useState([]);
  const [punchlist,    setPunchlist]    = useState([]);
  const [handover,     setHandover]     = useState([]);
  const [finalPackage, setFinalPackage] = useState([]);
  const [markupDwgItems, setMarkupDwgItems] = useState([]);
  const [markupTagIdItems, setMarkupTagIdItems] = useState([]);
  const [extractPdfItems, setExtractPdfItems] = useState([]);

  // Admin roles see every project; others only see their assigned projects
  const isAdmin = useMemo(
    () => ADMIN_ROLES.some(r => userProfile?.role?.includes(r)),
    [userProfile]
  );

  const visibleProjects = useMemo(() => {
    if (isAdmin) return projects;
    const assigned = Array.isArray(userProfile?.assignedProjects)
      ? userProfile.assignedProjects
      : [];
    return projects.filter(p => assigned.includes(p.id));
  }, [projects, isAdmin, userProfile]);

  const selectedProject = visibleProjects.find(p => p.id === selectedProjectId) || visibleProjects[0] || null;

  // Subscribe to Firestore realtime only when logged in
  useEffect(() => {
    if (!firebaseUser) {
      setDataLoaded(false);
      return;
    }

    setFirestoreError(null);
    let resolved = 0;
    const total  = 14;

    function onLoad() {
      resolved++;
      if (resolved >= total) setDataLoaded(true);
    }

    const onError = (err) => setFirestoreError(err?.message ?? 'Firestore error');

    const unsubs = [
      subscribeCategory(categories.projects,     d => { setProjects(d);     onLoad(); }),
      subscribeCategory(categories.tagOptions,   d => { setTagOptions(d);   onLoad(); }),
      subscribeCategory(categories.qcDocuments,  d => { setQcDocuments(d);  onLoad(); }),
      subscribeCategory(categories.itp,          d => { setItpItems(d);     onLoad(); }),
      subscribeCategory(categories.rfi,          d => { setRfiItems(d);     onLoad(); }),
      subscribeCategory(categories.materials,    d => { setMaterials(d);    onLoad(); }),
      subscribeCategory(categories.materialApprovals, d => { setMaterialApprovals(d); onLoad(); }),
      subscribeCategory(categories.ncr,          d => { setNcrItems(d);     onLoad(); }),
      subscribeCategory(categories.punchlist,    d => { setPunchlist(d);    onLoad(); }),
      subscribeCategory(categories.handover,     d => { setHandover(d);     onLoad(); }),
      subscribeCategory(categories.finalPackage, d => { setFinalPackage(d); onLoad(); }),
      subscribeCategory(categories.markupDwg,    d => { setMarkupDwgItems(d); onLoad(); }),
      subscribeCategory(categories.markupTagId,  d => { setMarkupTagIdItems(d); onLoad(); }),
      subscribeCategory(categories.extractPdf,   d => { setExtractPdfItems(d); onLoad(); }),
    ];

    return () => unsubs.forEach(u => u());
  }, [firebaseUser]);

  // Keep selectedProjectId valid when visibleProjects list changes
  useEffect(() => {
    if (!visibleProjects.length) return;
    if (!selectedProjectId || !visibleProjects.some(p => p.id === selectedProjectId)) {
      setSelectedProjectId(visibleProjects[0].id);
    }
  }, [visibleProjects, selectedProjectId]);

  const persist = async (fn) => {
    try {
      await fn();
    } catch (err) {
      setFirestoreError(err?.message ?? 'บันทึก Firestore ไม่สำเร็จ');
      throw err;
    }
  };

  // ── Generic CRUD ─────────────────────────────────────────────────────────────
  const addItemPersist = async (setter, category, item) => {
    if (item.id) {
      setter(prev => [...prev, item]);
      await persist(() => setItem(category, item));
      return;
    }
    const id = await persist(() => setItem(category, item));
    setter(prev => [...prev, { ...item, id }]);
  };

  const updateItemPersist = async (setter, category, id, changes, lastUpdatedAt) => {
    setter(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x));
    if (lastUpdatedAt) {
      await persist(() => updateItemSafe(category, id, changes, lastUpdatedAt));
    } else {
      await persist(() => setItem(category, { id, ...changes }));
    }
  };

  const deleteItemPersist = async (setter, category, id) => {
    setter(prev => prev.filter(x => x.id !== id));
    await persist(() => deleteItem(category, id));
  };

  // ── Projects ─────────────────────────────────────────────────────────────────
  const addProject    = item    => addItemPersist(setProjects, categories.projects, item);
  const updateProject = (id, c, lu) => updateItemPersist(setProjects, categories.projects, id, c, lu);
  const deleteProject = id      => deleteItemPersist(setProjects, categories.projects, id);

  // โ”€โ”€ Tag Options โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const addTagOption    = item    => addItemPersist(setTagOptions, categories.tagOptions, item);
  const updateTagOption = (id, c, lu) => updateItemPersist(setTagOptions, categories.tagOptions, id, c, lu);
  const deleteTagOption = id      => deleteItemPersist(setTagOptions, categories.tagOptions, id);

  // ── QC Documents ─────────────────────────────────────────────────────────────
  const addQcDocument    = item    => addItemPersist(setQcDocuments, categories.qcDocuments, item);
  const updateQcDocument = (id, c, lu) => updateItemPersist(setQcDocuments, categories.qcDocuments, id, c, lu);
  const deleteQcDocument = id      => deleteItemPersist(setQcDocuments, categories.qcDocuments, id);

  // ── ITP ──────────────────────────────────────────────────────────────────────
  const addItp    = item    => addItemPersist(setItpItems, categories.itp, item);
  const updateItp = (id, c, lu) => updateItemPersist(setItpItems, categories.itp, id, c, lu);
  const deleteItp = id      => deleteItemPersist(setItpItems, categories.itp, id);

  // ── RFI ──────────────────────────────────────────────────────────────────────
  const addRfi    = item    => addItemPersist(setRfiItems, categories.rfi, item);
  const updateRfi = (id, c, lu) => updateItemPersist(setRfiItems, categories.rfi, id, c, lu);
  const deleteRfi = id      => deleteItemPersist(setRfiItems, categories.rfi, id);

  // ── Materials ────────────────────────────────────────────────────────────────
  const addMaterial    = item    => addItemPersist(setMaterials, categories.materials, item);
  const updateMaterial = (id, c, lu) => updateItemPersist(setMaterials, categories.materials, id, c, lu);
  const deleteMaterial = id      => deleteItemPersist(setMaterials, categories.materials, id);

  const addMaterialApproval    = item    => addItemPersist(setMaterialApprovals, categories.materialApprovals, item);
  const updateMaterialApproval = (id, c, lu) => updateItemPersist(setMaterialApprovals, categories.materialApprovals, id, c, lu);
  const deleteMaterialApproval = id      => deleteItemPersist(setMaterialApprovals, categories.materialApprovals, id);

  // ── NCR ──────────────────────────────────────────────────────────────────────
  const addNcr    = item    => addItemPersist(setNcrItems, categories.ncr, item);
  const updateNcr = (id, c, lu) => updateItemPersist(setNcrItems, categories.ncr, id, c, lu);
  const deleteNcr = id      => deleteItemPersist(setNcrItems, categories.ncr, id);

  // ── Punchlist ────────────────────────────────────────────────────────────────
  const addPunch    = item    => addItemPersist(setPunchlist, categories.punchlist, item);
  const updatePunch = (id, c, lu) => updateItemPersist(setPunchlist, categories.punchlist, id, c, lu);
  const deletePunch = id      => deleteItemPersist(setPunchlist, categories.punchlist, id);

  // ── Handover ─────────────────────────────────────────────────────────────────
  const addHandover    = item    => addItemPersist(setHandover, categories.handover, item);
  const updateHandover = (id, c, lu) => updateItemPersist(setHandover, categories.handover, id, c, lu);
  const deleteHandover = id      => deleteItemPersist(setHandover, categories.handover, id);

  // ── Final Package ────────────────────────────────────────────────────────────
  const addFinalPackage    = item    => addItemPersist(setFinalPackage, categories.finalPackage, item);
  const updateFinalPackage = (id, c, lu) => updateItemPersist(setFinalPackage, categories.finalPackage, id, c, lu);
  const deleteFinalPackage = id      => deleteItemPersist(setFinalPackage, categories.finalPackage, id);

  // ── Markup DWG ──────────────────────────────────────────────────────────────
  const addMarkupDwg    = item    => addItemPersist(setMarkupDwgItems, categories.markupDwg, item);
  const updateMarkupDwg = (id, c, lu) => updateItemPersist(setMarkupDwgItems, categories.markupDwg, id, c, lu);
  const deleteMarkupDwg = id      => deleteItemPersist(setMarkupDwgItems, categories.markupDwg, id);

  // โ”€โ”€ Markup Tag ID โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
  const addMarkupTagId    = item    => addItemPersist(setMarkupTagIdItems, categories.markupTagId, item);
  const updateMarkupTagId = (id, c, lu) => updateItemPersist(setMarkupTagIdItems, categories.markupTagId, id, c, lu);
  const deleteMarkupTagId = id      => deleteItemPersist(setMarkupTagIdItems, categories.markupTagId, id);

  // ── Extract PDF ─────────────────────────────────────────────────────────────
  const addExtractPdf    = item    => addItemPersist(setExtractPdfItems, categories.extractPdf, item);
  const updateExtractPdf = (id, c, lu) => updateItemPersist(setExtractPdfItems, categories.extractPdf, id, c, lu);
  const deleteExtractPdf = id      => deleteItemPersist(setExtractPdfItems, categories.extractPdf, id);

  const value = {
    selectedProjectId, setSelectedProjectId,
    selectedProject,
    visibleProjects,
    isAdmin,
    dataLoaded,
    firestoreError,
    projects,     addProject,     updateProject,     deleteProject,
    tagOptions,   addTagOption,   updateTagOption,   deleteTagOption,
    qcDocuments,  addQcDocument,  updateQcDocument,  deleteQcDocument,
    itpItems,     addItp,         updateItp,         deleteItp,
    rfiItems,     addRfi,         updateRfi,         deleteRfi,
    materials,    addMaterial,    updateMaterial,    deleteMaterial,
    materialApprovals, addMaterialApproval, updateMaterialApproval, deleteMaterialApproval,
    ncrItems,     addNcr,         updateNcr,         deleteNcr,
    punchlist,    addPunch,       updatePunch,       deletePunch,
    handover,     addHandover,    updateHandover,    deleteHandover,
    finalPackage, addFinalPackage, updateFinalPackage, deleteFinalPackage,
    markupDwgItems, addMarkupDwg, updateMarkupDwg, deleteMarkupDwg,
    markupTagIdItems, addMarkupTagId, updateMarkupTagId, deleteMarkupTagId,
    extractPdfItems, addExtractPdf, updateExtractPdf, deleteExtractPdf,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
