import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { ADMIN_ROLES, APP_NAME } from './constants';

const ROLE_PERM_DOC = `${APP_NAME}/root/appMeta/rolePermissions`;

/**
 * Hook สำหรับตรวจสิทธิ์เมนูและ action ตาม role ของ user ปัจจุบัน
 */
export function useMenuPermissions() {
  const { userProfile } = useAuth();
  const [rolePerms, setRolePerms] = useState({});

  useEffect(() => {
    const ref = doc(db, ROLE_PERM_DOC);
    const unsub = onSnapshot(
      ref,
      snap => setRolePerms(snap.exists() ? (snap.data() || {}) : {}),
      () => {},
    );
    return () => unsub();
  }, []);

  const userRoles = useMemo(
    () => (Array.isArray(userProfile?.role) ? userProfile.role : (userProfile?.role ? [userProfile.role] : [])),
    [userProfile],
  );

  const isAdmin = useMemo(
    () => userRoles.some(r => ADMIN_ROLES.includes(r)),
    [userRoles],
  );

  const hasConfig = useMemo(
    () => Object.keys(rolePerms || {}).length > 0,
    [rolePerms],
  );

  function canRead(menuId) {
    if (!userRoles.length) return false;
    if (!hasConfig) return true; // ยังไม่ได้ตั้งค่าอะไร → ให้เข้าได้ตามเดิม
    return userRoles.some(role => !!rolePerms?.[role]?.[menuId]?.read);
  }

  function canAction(menuId, actionId) {
    if (!userRoles.length) return false;
    if (!hasConfig) return true;
    // Admin สามารถ override ถ้าต้องการให้ผ่านทุกกรณี
    if (isAdmin) return true;
    return userRoles.some((role) => {
      const perm = rolePerms?.[role]?.[menuId];
      if (!perm) return false;
      if (perm.write) return true; // write ทั้งเมนู
      const actions = perm.actions || {};
      return !!actions[actionId];
    });
  }

  return { canRead, canAction, rolePerms, userRoles };
}

