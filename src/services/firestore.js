import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
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

/** อ้างอิง subcollection ใต้ root เช่น projects, qcDocuments, itp, rfi, materials, ncr, punchlist, handover, finalPackage, users */
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

export const categories = {
  users: 'users',
  projects: 'projects',
  qcDocuments: 'qcDocuments',
  itp: 'itp',
  rfi: 'rfi',
  materials: 'materials',
  ncr: 'ncr',
  punchlist: 'punchlist',
  handover: 'handover',
  finalPackage: 'finalPackage',
};
