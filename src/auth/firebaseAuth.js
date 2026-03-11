import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { APP_NAME } from './constants';
import { setSessionExpiry, clearSession } from './session';

const googleProvider = new GoogleAuthProvider();

const USERS_PATH    = `${APP_NAME}/root/users`;
const META_PATH     = `${APP_NAME}/root/appMeta/config`;
const ACTIVITY_PATH = `${APP_NAME}/root/activityLogs`;

function logActivity(action, uid, meta = {}) {
  addDoc(collection(db, ACTIVITY_PATH), {
    action,
    uid,
    meta,
    createdAt: serverTimestamp(),
  }).catch(() => {});
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_PATH, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
}

async function createUserProfile(user, overrides = {}) {
  const userRef = doc(db, USERS_PATH, user.uid);
  const metaRef = doc(db, META_PATH);

  return runTransaction(db, async (tx) => {
    const metaSnap   = await tx.get(metaRef);
    const isFirst    = !metaSnap.exists() || !metaSnap.data().firstUserRegistered;
    const totalUsers = (metaSnap.data()?.totalUsers ?? 0) + 1;

    tx.set(metaRef, {
      firstUserRegistered: true,
      totalUsers,
      ...(isFirst ? { createdAt: serverTimestamp() } : {}),
    }, { merge: true });

    const profile = {
      uid:              user.uid,
      email:            user.email ?? '',
      firstName:        overrides.firstName  ?? '',
      lastName:         overrides.lastName   ?? '',
      position:         overrides.position   ?? '',
      role:             isFirst ? ['MasterAdmin'] : (overrides.role ?? ['Staff']),
      status:           isFirst ? 'approved'     : (overrides.status ?? 'pending'),
      assignedProjects: [],
      createdAt:        serverTimestamp(),
      photoURL:         user.photoURL ?? null,
      isFirstUser:      isFirst,
    };

    tx.set(userRef, profile);
    return profile;
  });
}

export async function loginWithEmail(email, password) {
  setSessionExpiry(); // MUST be before any await to prevent race condition
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const profile   = await fetchUserProfile(user.uid);
    logActivity('LOGIN', user.uid, { method: 'email' });
    return profile ?? await createUserProfile(user);
  } catch (err) {
    const code = err.code ?? err.message;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      throw new Error('invalid-credential');
    }
    if (code === 'auth/user-not-found') throw new Error('user-not-found');
    throw err;
  }
}

export async function loginWithGoogle() {
  setSessionExpiry();
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    const existing  = await fetchUserProfile(user.uid);
    if (existing) {
      logActivity('LOGIN', user.uid, { method: 'google' });
      return existing;
    }
    const created = await createUserProfile(user, { role: ['Staff'], status: 'pending' });
    logActivity('REGISTER', user.uid, { method: 'google' });
    return created;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[loginWithGoogle] error:', err.code, err.message);

    if (err.code === 'auth/popup-closed-by-user')       throw new Error('popup-closed');
    if (err.code === 'auth/cancelled-popup-request')    throw new Error('popup-closed');
    if (err.code === 'auth/unauthorized-domain')        throw new Error('unauthorized-domain');
    if (err.code === 'auth/popup-blocked')              throw new Error('popup-blocked');
    if (err.code === 'auth/operation-not-allowed')      throw new Error('operation-not-allowed');
    if (err.code === 'auth/network-request-failed')     throw new Error('network-error');
    // Firestore permission error (rules not configured yet)
    if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
      throw new Error('firestore-permission');
    }
    throw err;
  }
}

export async function registerWithEmail(email, password, firstName, lastName, position) {
  setSessionExpiry();
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const profile   = await createUserProfile(user, { firstName, lastName, position });
  logActivity('REGISTER', user.uid, { method: 'email' });
  return profile;
}

export async function logout() {
  clearSession();
  await signOut(auth);
}

export async function updateUserProfileDoc(uid, changes) {
  await setDoc(doc(db, USERS_PATH, uid), changes, { merge: true });
}

export { auth };
