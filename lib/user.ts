import { Role, User } from '@/types';
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_AUTH_SECRET_KEY as string;

if (!SECRET_KEY) {
  console.warn('AUTH_SECRET_KEY is not defined in your .env file');
}

export type StoredUser = User;

export const storeUser = (user: StoredUser): void => {
  try {
    if (typeof window === 'undefined') return;

    const encryptedUser = CryptoJS.AES.encrypt(
      JSON.stringify(user),
      SECRET_KEY,
    ).toString();
    localStorage.setItem('user', encryptedUser);
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

// 2. Get User (Decrypt and retrieve from localStorage)
export const getUser = (): StoredUser | null => {
  try {
    if (typeof window === 'undefined') return null;

    const encryptedUser = localStorage.getItem('user');
    if (!encryptedUser) return null;

    const bytes = CryptoJS.AES.decrypt(encryptedUser, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    return JSON.parse(decrypted) as StoredUser;
  } catch (error) {
    // Silently clear corrupted storage on decryption failure
    // This happens when the SECRET_KEY changes (expected behavior for security)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
    }
    return null;
  }
};

export const resolvePostLoginPath = (): string => {
  const role = getRoleAndPermissions();
  const roleName = role?.name?.toLowerCase();

  if (roleName === 'admin') {
    return '/admin/dashboard';
  }

  if (roleName === 'staff') {
    // Staff goes to /admin/orders as default entry point.
    // AdminAuthGuard will redirect to first permitted route if they lack orders access.
    return '/admin/orders';
  }

  // customer, null, or unrecognized role → home page
  return '/';
};

// 3. Remove User (Remove user from localStorage)
export const removeUser = (): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('user');
    removeRoleAndPermissions();
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

export const storeRoleAndPermissions = (role: Role): void => {
  try {
    if (typeof window === 'undefined') return;

    const encryptedRole = CryptoJS.AES.encrypt(
      JSON.stringify(role),
      SECRET_KEY,
    ).toString();
    localStorage.setItem('role', encryptedRole);
  } catch (error) {
    console.error('Error storing role:', error);
  }
};

export const getRoleAndPermissions = (): Role | null => {
  try {
    if (typeof window === 'undefined') return null;

    const encryptedRole = localStorage.getItem('role');
    if (!encryptedRole) return null;

    const bytes = CryptoJS.AES.decrypt(encryptedRole, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    return JSON.parse(decrypted) as Role;
  } catch (error) {
    // Silently clear corrupted storage on decryption failure
    // This happens when the SECRET_KEY changes (expected behavior for security)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('role');
      localStorage.removeItem('user');
    }
    return null;
  }
};

export const removeRoleAndPermissions = (): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('role');
  } catch (error) {
    console.error('Error removing role:', error);
  }
};

