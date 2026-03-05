import { createContext, useContext, useState, useEffect } from 'react';
import {
  USERS,
  INITIAL_PROJECTS,
  INITIAL_QC_DOCUMENTS,
  INITIAL_ITP,
  INITIAL_RFI,
  INITIAL_MATERIALS,
  INITIAL_NCR,
  INITIAL_PUNCHLIST,
  INITIAL_HANDOVER,
  INITIAL_FINAL_PACKAGE,
} from '../data/mockData';
import {
  getCategory,
  setItem,
  deleteItem,
  categories,
} from '../services/firestore';

const AppContext = createContext(null);

const defaultState = {
  projects: INITIAL_PROJECTS,
  qcDocuments: INITIAL_QC_DOCUMENTS,
  itpItems: INITIAL_ITP,
  rfiItems: INITIAL_RFI,
  materials: INITIAL_MATERIALS,
  ncrItems: INITIAL_NCR,
  punchlist: INITIAL_PUNCHLIST,
  handover: INITIAL_HANDOVER,
  finalPackage: INITIAL_FINAL_PACKAGE,
};

export function AppProvider({ children }) {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);

  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [selectedProjectId, setSelectedProjectId] = useState(INITIAL_PROJECTS[0]?.id ?? '');

  const [projects, setProjects]           = useState(INITIAL_PROJECTS);
  const [qcDocuments, setQcDocuments]     = useState(INITIAL_QC_DOCUMENTS);
  const [itpItems, setItpItems]           = useState(INITIAL_ITP);
  const [rfiItems, setRfiItems]           = useState(INITIAL_RFI);
  const [materials, setMaterials]         = useState(INITIAL_MATERIALS);
  const [ncrItems, setNcrItems]           = useState(INITIAL_NCR);
  const [punchlist, setPunchlist]         = useState(INITIAL_PUNCHLIST);
  const [handover, setHandover]           = useState(INITIAL_HANDOVER);
  const [finalPackage, setFinalPackage]   = useState(INITIAL_FINAL_PACKAGE);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // โหลดจาก Firestore ตอน mount (QC-System > root > แต่ละหมวด)
  useEffect(() => {
    let cancelled = false;
    setFirestoreError(null);
    (async () => {
      try {
        const [proj, qc, itp, rfi, mat, ncr, punch, ho, fp] = await Promise.all([
          getCategory(categories.projects),
          getCategory(categories.qcDocuments),
          getCategory(categories.itp),
          getCategory(categories.rfi),
          getCategory(categories.materials),
          getCategory(categories.ncr),
          getCategory(categories.punchlist),
          getCategory(categories.handover),
          getCategory(categories.finalPackage),
        ]);
        if (cancelled) return;
        if (proj.length) setProjects(proj);
        if (qc.length) setQcDocuments(qc);
        if (itp.length) setItpItems(itp);
        if (rfi.length) setRfiItems(rfi);
        if (mat.length) setMaterials(mat);
        if (ncr.length) setNcrItems(ncr);
        if (punch.length) setPunchlist(punch);
        if (ho.length) setHandover(ho);
        if (fp.length) setFinalPackage(fp);
        if (proj.length && !selectedProjectId) setSelectedProjectId(proj[0].id);
      } catch (err) {
        if (!cancelled) setFirestoreError(err?.message || 'โหลด Firestore ไม่ได้ ใช้ข้อมูล Mock');
      } finally {
        if (!cancelled) setDataLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync selectedProjectId เมื่อ projects เปลี่ยน (เช่น โหลดจาก Firestore)
  useEffect(() => {
    if (!dataLoaded || !projects.length) return;
    if (!selectedProjectId || !projects.some(p => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [dataLoaded, projects, selectedProjectId]);

  const persist = async (category, fn) => {
    try {
      await fn();
    } catch (err) {
      setFirestoreError(err?.message || 'บันทึก Firestore ไม่สำเร็จ');
    }
  };

  // ── Generic CRUD + Firestore ───────────────────────────────────────────────
  const addItemPersist = async (setter, category, item) => {
    if (item.id) {
      setter(prev => [...prev, item]);
      await persist(category, () => setItem(category, item));
      return;
    }
    const id = await setItem(category, item);
    setter(prev => [...prev, { ...item, id }]);
  };
  const updateItemPersist = (setter, category, id, changes) => {
    setter(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x));
    persist(category, () => setItem(category, { id, ...changes }));
  };
  const deleteItemPersist = (setter, category, id) => {
    setter(prev => prev.filter(x => x.id !== id));
    persist(category, () => deleteItem(category, id));
  };

  // ── Projects ──────────────────────────────────────────────────────────────
  const addProject    = item    => addItemPersist(setProjects, categories.projects, item);
  const updateProject = (id, c) => updateItemPersist(setProjects, categories.projects, id, c);
  const deleteProject = id      => deleteItemPersist(setProjects, categories.projects, id);

  // ── QC Documents ──────────────────────────────────────────────────────────
  const addQcDocument    = item    => addItemPersist(setQcDocuments, categories.qcDocuments, item);
  const updateQcDocument = (id, c) => updateItemPersist(setQcDocuments, categories.qcDocuments, id, c);
  const deleteQcDocument = id      => deleteItemPersist(setQcDocuments, categories.qcDocuments, id);

  // ── ITP ───────────────────────────────────────────────────────────────────
  const addItp    = item    => addItemPersist(setItpItems, categories.itp, item);
  const updateItp = (id, c) => updateItemPersist(setItpItems, categories.itp, id, c);
  const deleteItp = id      => deleteItemPersist(setItpItems, categories.itp, id);

  // ── RFI ───────────────────────────────────────────────────────────────────
  const addRfi    = item    => addItemPersist(setRfiItems, categories.rfi, item);
  const updateRfi = (id, c) => updateItemPersist(setRfiItems, categories.rfi, id, c);
  const deleteRfi = id      => deleteItemPersist(setRfiItems, categories.rfi, id);

  // ── Materials ─────────────────────────────────────────────────────────────
  const addMaterial    = item    => addItemPersist(setMaterials, categories.materials, item);
  const updateMaterial = (id, c) => updateItemPersist(setMaterials, categories.materials, id, c);
  const deleteMaterial = id      => deleteItemPersist(setMaterials, categories.materials, id);

  // ── NCR ───────────────────────────────────────────────────────────────────
  const addNcr    = item    => addItemPersist(setNcrItems, categories.ncr, item);
  const updateNcr = (id, c) => updateItemPersist(setNcrItems, categories.ncr, id, c);
  const deleteNcr = id      => deleteItemPersist(setNcrItems, categories.ncr, id);

  // ── Punchlist ─────────────────────────────────────────────────────────────
  const addPunch    = item    => addItemPersist(setPunchlist, categories.punchlist, item);
  const updatePunch = (id, c) => updateItemPersist(setPunchlist, categories.punchlist, id, c);
  const deletePunch = id      => deleteItemPersist(setPunchlist, categories.punchlist, id);

  // ── Handover ──────────────────────────────────────────────────────────────
  const addHandover    = item    => addItemPersist(setHandover, categories.handover, item);
  const updateHandover = (id, c) => updateItemPersist(setHandover, categories.handover, id, c);
  const deleteHandover = id      => deleteItemPersist(setHandover, categories.handover, id);

  // ── Final Package ─────────────────────────────────────────────────────────
  const addFinalPackage    = item    => addItemPersist(setFinalPackage, categories.finalPackage, item);
  const updateFinalPackage = (id, c) => updateItemPersist(setFinalPackage, categories.finalPackage, id, c);
  const deleteFinalPackage = id      => deleteItemPersist(setFinalPackage, categories.finalPackage, id);

  const value = {
    currentUser, setCurrentUser,
    users: USERS,
    selectedProjectId, setSelectedProjectId,
    selectedProject,
    dataLoaded,
    firestoreError,
    projects, addProject, updateProject, deleteProject,
    qcDocuments, addQcDocument, updateQcDocument, deleteQcDocument,
    itpItems, addItp, updateItp, deleteItp,
    rfiItems, addRfi, updateRfi, deleteRfi,
    materials, addMaterial, updateMaterial, deleteMaterial,
    ncrItems, addNcr, updateNcr, deleteNcr,
    punchlist, addPunch, updatePunch, deletePunch,
    handover, addHandover, updateHandover, deleteHandover,
    finalPackage, addFinalPackage, updateFinalPackage, deleteFinalPackage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
