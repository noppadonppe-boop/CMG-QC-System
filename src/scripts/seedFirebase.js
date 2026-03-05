/**
 * นำ Mock Data จาก mockData.js ขึ้น Firebase Firestore
 * โครงสร้าง: QC-System (collection) > root (document) > หมวดหมู่ (subcollections)
 *
 * วิธีใช้: เปิดแอปด้วย query ?seed=1 แล้วกดปุ่ม Seed ใน Dev Seed Panel หรือเรียก seedFirebase() จาก console
 */
import { ensureRootDocument, setCategoryBatch, categories } from '../services/firestore';
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

export async function seedFirebase() {
  await ensureRootDocument();
  const payloads = [
    [categories.users, USERS],
    [categories.projects, INITIAL_PROJECTS],
    [categories.qcDocuments, INITIAL_QC_DOCUMENTS],
    [categories.itp, INITIAL_ITP],
    [categories.rfi, INITIAL_RFI],
    [categories.materials, INITIAL_MATERIALS],
    [categories.ncr, INITIAL_NCR],
    [categories.punchlist, INITIAL_PUNCHLIST],
    [categories.handover, INITIAL_HANDOVER],
    [categories.finalPackage, INITIAL_FINAL_PACKAGE],
  ];

  for (const [category, items] of payloads) {
    if (!items?.length) continue;
    await setCategoryBatch(category, items);
  }

  return { ok: true, message: 'Seed เสร็จแล้ว: QC-System > root > แต่ละหมวดหมู่' };
}
