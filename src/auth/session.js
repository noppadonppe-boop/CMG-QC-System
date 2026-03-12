import { APP_PREFIX } from './constants';

const SESSION_KEY = `${APP_PREFIX}_session_expires`;

/** ยังเรียกได้เพื่อความเข้ากันได้ แต่ไม่ใช้จำกัดเวลา — เซสชันขึ้นกับ Firebase Auth เท่านั้น */
export function setSessionExpiry() {
  localStorage.setItem(SESSION_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year (ไม่ใช้เช็คหมดอายุ)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** ไม่จำกัดเวลา — คืนค่า false เสมอ (ให้ Firebase เป็นคนจัดการ logout) */
export function isSessionExpired() {
  return false;
}

/** ไม่มีนับถอยหลัง — คืน null เมื่อไม่จำกัดเวลา */
export function getRemainingMinutes() {
  return null;
}
