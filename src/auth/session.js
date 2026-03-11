import { APP_PREFIX } from './constants';

const SESSION_KEY         = `${APP_PREFIX}_session_expires`;
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function setSessionExpiry() {
  localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_DURATION_MS));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return true;
  const expires = Number(raw);
  if (Number.isNaN(expires)) return true;
  return Date.now() > expires;
}

export function getRemainingMinutes() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return 0;
  const expires = Number(raw);
  if (Number.isNaN(expires)) return 0;
  const diff = expires - Date.now();
  return diff <= 0 ? 0 : Math.floor(diff / 60_000);
}
