'use client';

/**
 * AdminRedirect — silently redirects admin/staff users to the admin dashboard.
 *
 * Rendered inside the public layout so it runs on every public page.
 * Customers and guests are unaffected — this only fires for admin/staff tokens.
 * Returns null (no visible UI).
 */

import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { validateToken } from '@/lib/utils/token-validation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AdminRedirect() {
  const router = useRouter();
  const adminToken = useAdminAuthStore((state) => state.token);

  useEffect(() => {
    const result = validateToken(adminToken);
    if (!result.valid) return;

    const role = result.payload?.role;
    if (role === 'admin' || role === 'staff') {
      router.replace('/admin/dashboard');
    }
  }, [adminToken, router]);

  return null;
}
