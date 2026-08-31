import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'QC-System';
const ROOT_DOC_ID = 'root';

function rootRef() {
  return doc(db, COLLECTION_NAME, ROOT_DOC_ID);
}

/** สร้าง document root ถ้ายังไม่มี (เพื่อให้มี collection QC-System/root) */
export async function ensureRootDocument() {
  const snap = await getDoc(rootRef());
  if (!snap.exists()) {
    await setDoc(rootRef(), { createdAt: serverTimestamp(), label: 'QC-System root' });
  }
}

/** อ้างอิง subcollection ใต้ root เช่น projects, qcDocuments, itp, rfi, materials, materialApprovals, ncr, punchlist, handover, finalPackage, users */
function subcollectionRef(category) {
  return collection(db, COLLECTION_NAME, ROOT_DOC_ID, category);
}

function docRef(category, id) {
  return doc(db, COLLECTION_NAME, ROOT_DOC_ID, category, id);
}

/** ลบ undefined ออกจาก object (Firestore รับ undefined ไม่ได้) */
function stripUndefined(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = typeof v === 'object' && v !== null && !(v instanceof Date) ? stripUndefined(v) : v;
  }
  return out;
}

/**
 * ดึงข้อมูลทั้งหมวด (array ของ documents)
 */
export async function getCategory(category) {
  const snap = await getDocs(subcollectionRef(category));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * บันทึก/อัปเดตหนึ่งรายการ (ใช้ id จาก item ถ้ามี)
 */
export async function setItem(category, item) {
  const id = item.id || undefined;
  const payload = { ...item };
  delete payload.id;

  if (id) {
    const clean = stripUndefined(payload);
    clean.updatedAt = serverTimestamp();
    await setDoc(docRef(category, id), clean, { merge: true });
    return id;
  }
  const clean = stripUndefined(payload);
  clean.createdAt = serverTimestamp();
  const ref = await addDoc(subcollectionRef(category), clean);
  return ref.id;
}

/**
 * ลบหนึ่งรายการ
 */
export async function deleteItem(category, id) {
  await deleteDoc(docRef(category, id));
}

/**
 * บันทึกหลายรายการในหมวดเดียวกัน (ใช้ batch)
 */
export async function setCategoryBatch(category, items) {
  const batch = writeBatch(db);
  for (const item of items) {
    const id = item.id;
    if (!id) continue;
    const payload = { ...item };
    delete payload.id;
    const clean = stripUndefined(payload);
    clean.updatedAt = serverTimestamp();
    batch.set(docRef(category, id), clean, { merge: true });
  }
  await batch.commit();
}

/**
 * Create a deterministic document only when its id is still unused. The
 * transaction prevents two clients from silently overwriting the same item.
 */
export async function createCategoryItemIfAbsent(category, item) {
  if (!item?.id) throw new Error('Document id is required');

  const ref = docRef(category, item.id);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const error = new Error('Document already exists');
      error.code = 'ALREADY_EXISTS';
      throw error;
    }

    const payload = { ...item };
    delete payload.id;
    const clean = stripUndefined(payload);
    clean.createdAt = serverTimestamp();
    clean.updatedAt = serverTimestamp();
    transaction.set(ref, clean);
  });
}

/**
 * Subscribe to a category in realtime. Returns unsubscribe function.
 * @param {string} category
 * @param {(docs: any[]) => void} onData
 */
export function subscribeCategory(category, onData) {
  return onSnapshot(
    subcollectionRef(category),
    (snap) => onData(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    () => {}, // silent error
  );
}

/**
 * Update an item with optimistic conflict detection.
 * Throws Error('CONFLICT') if updatedAt has changed since lastUpdatedAt.
 */
export async function updateItemSafe(category, id, changes, lastUpdatedAt) {
  const ref = docRef(category, id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('NOT_FOUND');

    if (lastUpdatedAt) {
      const remoteMs = snap.data().updatedAt?.toMillis?.() ?? 0;
      const localMs  = typeof lastUpdatedAt.toMillis === 'function'
        ? lastUpdatedAt.toMillis()
        : lastUpdatedAt;
      if (remoteMs > localMs) throw new Error('CONFLICT');
    }

    const clean = stripUndefined({ ...changes });
    clean.updatedAt = serverTimestamp();
    tx.set(ref, clean, { merge: true });
  });
}

export const categories = {
  users:        'users',
  projects:     'projects',
  tagOptions:   'tagOptions',
  qcDocuments:  'qcDocuments',
  itp:          'itp',
  rfi:          'rfi',
  materials:    'materials',
  materialApprovals: 'materialApprovals',
  ncr:          'ncr',
  punchlist:    'punchlist',
  handover:     'handover',
  finalPackage: 'finalPackage',
  markupDwg:    'markupDwg',
  markupTagId:  'markupTagId',
  extractPdf:   'extractPdf',
};

/**
 * Replace the CI choices for one RFI against the latest server state. Every
 * referenced RFI, CI group, and relation is read before the writes so a
 * concurrent edit causes Firestore to retry the complete selection.
 */
export async function replaceRfiCiAssignments({
  projectId,
  rfiId,
  rfiNo,
  assignments = [],
}) {
  const uniqueAssignments = [...new Map(
    assignments
      .filter(item => item?.id && item?.ciGroupId)
      .map(item => [item.ciGroupId, item]),
  ).values()];

  return runTransaction(db, async (transaction) => {
    const rfiRef = docRef(categories.rfi, rfiId);
    const ciRefs = uniqueAssignments.map(item => docRef(categories.finalPackage, item.ciGroupId));
    const linkRefs = uniqueAssignments.map(item => docRef(categories.finalPackage, item.id));
    const [rfiSnapshot, ciSnapshots, linkSnapshots] = await Promise.all([
      transaction.get(rfiRef),
      Promise.all(ciRefs.map(ref => transaction.get(ref))),
      Promise.all(linkRefs.map(ref => transaction.get(ref))),
    ]);

    if (!rfiSnapshot.exists() || rfiSnapshot.data().projectId !== projectId) {
      const error = new Error('RFI reference changed');
      error.code = 'REFERENCE_CHANGED';
      throw error;
    }

    ciSnapshots.forEach((snapshot, index) => {
      const data = snapshot.data();
      if (
        !snapshot.exists() ||
        data.projectId !== projectId ||
        data.recordType !== 'ci-group' ||
        data.active === false
      ) {
        const error = new Error(`CI reference changed: ${uniqueAssignments[index].ciCode || ''}`);
        error.code = 'REFERENCE_CHANGED';
        throw error;
      }
    });

    const resolvedItems = [];
    uniqueAssignments.forEach((assignment, index) => {
      const snapshot = linkSnapshots[index];
      const existing = snapshot.data();
      if (snapshot.exists() && (
        existing.projectId !== projectId ||
        existing.rfiId !== rfiId ||
        existing.ciGroupId !== assignment.ciGroupId
      )) {
        const error = new Error('CI assignment id conflict');
        error.code = 'DATA_CONFLICT';
        throw error;
      }

      const isActive = snapshot.exists() && existing.active !== false;
      const shouldBeActive = Boolean(assignment.active);
      if (isActive === shouldBeActive) {
        if (snapshot.exists()) {
          resolvedItems.push(shouldBeActive
            ? { ...existing, id: assignment.id }
            : { id: assignment.id, active: false });
        }
        return;
      }

      if (shouldBeActive) {
        const localItem = {
          id: assignment.id,
          recordType: 'ci-rfi-link',
          schemaVersion: 1,
          projectId,
          rfiId,
          ciGroupId: assignment.ciGroupId,
          rfiNo,
          ciCode: assignment.ciCode,
          active: true,
          unassignedAt: null,
          ...(snapshot.exists() ? {} : { createdAt: new Date() }),
        };
        const remoteItem = stripUndefined({ ...localItem });
        delete remoteItem.id;
        if (!snapshot.exists()) remoteItem.createdAt = serverTimestamp();
        remoteItem.updatedAt = serverTimestamp();
        transaction.set(linkRefs[index], remoteItem, { merge: true });
        resolvedItems.push(localItem);
        return;
      }

      const localItem = {
        id: assignment.id,
        active: false,
        unassignedAt: new Date(),
      };
      transaction.set(linkRefs[index], {
        active: false,
        unassignedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      resolvedItems.push(localItem);
    });

    return resolvedItems;
  });
}
