'use client';

/**
 * Google OAuth Callback Page — app/(auth)/auth/google/callback/page.tsx
 *
 * The backend redirects here after successful Google authentication with
 * ?token=...&user=... query params. This page reads the params, stores
 * the auth state, and redirects to /account.
 *
 * If params are missing, redirects to /login with an error.
 */

import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useCustomerAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (!token || !userParam) {
      router.replace('/login?error=google_failed');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam));

      const customerUser = {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'customer',
        hasBulkAccess: user.isBulkBuyer ?? false,
        hasCODAccess: user.hasCODAccess ?? user.isCodEnabled ?? false,
      };

      setAuth(customerUser, token);
      router.replace('/account');
    } catch {
      router.replace('/login?error=google_failed');
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
