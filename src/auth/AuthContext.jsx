// @refresh reset
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, fetchUserProfile, logout, updateUserProfileDoc } from './firebaseAuth';
import { db } from '../config/firebase';
import { APP_NAME } from './constants';
import { clearSession, getRemainingMinutes } from './session';

// Retry helper: ดึง profile ซ้ำสูงสุด N ครั้ง รอ delay ms ต่อรอบ
// (ป้องกัน race condition: onAuthStateChanged ยิงก่อน createUserProfile เสร็จ)
async function fetchWithRetry(uid, maxRetries = 5, delayMs = 800) {
  for (let i = 0; i < maxRetries; i++) {
    const profile = await fetchUserProfile(uid);
    if (profile) return profile;
    if (i < maxRetries - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser,      setFirebaseUser]      = useState(null);
  const [userProfile,       setUserProfile]       = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(0);

  async function loadProfile(user, useRetry = false) {
    if (!user) { setUserProfile(null); return; }
    try {
      // ใช้ retry เฉพาะตอน onAuthStateChanged เพื่อรอ createUserProfile เสร็จก่อน
      let profile = useRetry
        ? await fetchWithRetry(user.uid)
        : await fetchUserProfile(user.uid);

      // อัปเดตรูปโปรไฟล์จาก Firebase Auth ทุกครั้งหลัง login
      const authPhoto = auth.currentUser?.photoURL ?? null;
      if (authPhoto && profile && authPhoto !== profile.photoURL) {
        profile = { ...profile, photoURL: authPhoto };
        updateUserProfileDoc(user.uid, { photoURL: authPhoto }).catch(() => {});
      }

      setUserProfile(profile);
    } catch {
      setUserProfile(null); // silent — never block auth flow
    }
  }

  async function refreshProfile() {
    // ใช้ auth.currentUser โดยตรง ไม่ใช้ firebaseUser state
    // เพราะ React state อาจยัง stale (null) หลัง signInWithPopup resolve
    const current = auth.currentUser;
    if (!current) return;
    await loadProfile(current, false);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // ไม่เช็ค session หมดอายุ — ใช้แค่ Firebase Auth (logout เมื่อ Firebase sign out / token หมดอายุ / Admin ลบ profile)

      // useRetry=true: รอ createUserProfile เสร็จก่อน (กรณี Google new user)
      await loadProfile(user, true);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Realtime subscribe current user's profile document
  useEffect(() => {
    if (!firebaseUser?.uid) return undefined;

    const ref = doc(db, `${APP_NAME}/root/users`, firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          // Admin ลบ profile doc ทิ้ง → sign out อัตโนมัติ
          clearSession();
          setUserProfile(null);
          setFirebaseUser(null);
          await logout().catch(() => {});
          return;
        }
        setUserProfile(prev => {
          const data = snap.data();
          return { uid: snap.id, ...(typeof prev === 'object' ? prev : {}), ...data };
        });
      },
      () => {
        // error เงียบ ไม่ block UI
      },
    );

    return () => unsub();
  }, [firebaseUser?.uid]);

  // ไม่นับถอยหลังเซสชัน (ไม่จำกัดเวลา)
  useEffect(() => {
    setSessionMinutesLeft(getRemainingMinutes());
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, sessionMinutesLeft, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
