import { createContext, useContext, useState } from 'react';
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

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(USERS[0]);
  const [selectedProjectId, setSelectedProjectId] = useState(INITIAL_PROJECTS[0].id);

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

  // ── Generic CRUD helpers ──────────────────────────────────────────────────
  const addItem    = (setter, item)         => setter(prev => [...prev, item]);
  const updateItem = (setter, id, changes)  => setter(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x));
  const deleteItem = (setter, id)           => setter(prev => prev.filter(x => x.id !== id));

  // ── Projects ──────────────────────────────────────────────────────────────
  const addProject    = item    => addItem(setProjects, item);
  const updateProject = (id, c) => updateItem(setProjects, id, c);
  const deleteProject = id      => deleteItem(setProjects, id);

  // ── QC Documents ──────────────────────────────────────────────────────────
  const addQcDocument    = item    => addItem(setQcDocuments, item);
  const updateQcDocument = (id, c) => updateItem(setQcDocuments, id, c);
  const deleteQcDocument = id      => deleteItem(setQcDocuments, id);

  // ── ITP ───────────────────────────────────────────────────────────────────
  const addItp    = item    => addItem(setItpItems, item);
  const updateItp = (id, c) => updateItem(setItpItems, id, c);
  const deleteItp = id      => deleteItem(setItpItems, id);

  // ── RFI ───────────────────────────────────────────────────────────────────
  const addRfi    = item    => addItem(setRfiItems, item);
  const updateRfi = (id, c) => updateItem(setRfiItems, id, c);
  const deleteRfi = id      => deleteItem(setRfiItems, id);

  // ── Materials ─────────────────────────────────────────────────────────────
  const addMaterial    = item    => addItem(setMaterials, item);
  const updateMaterial = (id, c) => updateItem(setMaterials, id, c);
  const deleteMaterial = id      => deleteItem(setMaterials, id);

  // ── NCR ───────────────────────────────────────────────────────────────────
  const addNcr    = item    => addItem(setNcrItems, item);
  const updateNcr = (id, c) => updateItem(setNcrItems, id, c);
  const deleteNcr = id      => deleteItem(setNcrItems, id);

  // ── Punchlist ─────────────────────────────────────────────────────────────
  const addPunch    = item    => addItem(setPunchlist, item);
  const updatePunch = (id, c) => updateItem(setPunchlist, id, c);
  const deletePunch = id      => deleteItem(setPunchlist, id);

  // ── Handover ──────────────────────────────────────────────────────────────
  const addHandover    = item    => addItem(setHandover, item);
  const updateHandover = (id, c) => updateItem(setHandover, id, c);
  const deleteHandover = id      => deleteItem(setHandover, id);

  // ── Final Package ─────────────────────────────────────────────────────────
  const addFinalPackage    = item    => addItem(setFinalPackage, item);
  const updateFinalPackage = (id, c) => updateItem(setFinalPackage, id, c);
  const deleteFinalPackage = id      => deleteItem(setFinalPackage, id);

  const value = {
    // Auth
    currentUser, setCurrentUser,
    users: USERS,
    // Project selection
    selectedProjectId, setSelectedProjectId,
    selectedProject,
    // Data
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
