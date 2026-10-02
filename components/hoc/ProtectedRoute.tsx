'use client';

import NoPermission from '@/components/no-permission';
import MainLoader from '@/components/shared/MainLoader';
import {
  getUser,
} from '@/lib/user';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'admin';
  permission?: string;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  role,
}) => {
  const router = useRouter();

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const user = useMemo(() => (isHydrated ? getUser() : null), [isHydrated]);

  const { redirectTo, showNoPermission } = useMemo(() => {
    if (!isHydrated) {
      return { redirectTo: null as string | null, showNoPermission: false };
    }

    if (!user) {
      return { redirectTo: '/login', showNoPermission: false };
    }

    if (user.must_change_pass) {
      return { redirectTo: '/login/update-password', showNoPermission: false };
    }

    //  ADMIN
    if (role === 'admin') {
      return { redirectTo: null, showNoPermission: false };
    }

    return { redirectTo: null, showNoPermission: false };
  }, [
    isHydrated,
    role,
    user,
  ]);

  useEffect(() => {
    if (!isHydrated || !redirectTo) return;
    router.replace(redirectTo);
  }, [isHydrated, redirectTo, router]);

  if (!isHydrated || redirectTo) {
    return <MainLoader />;
  }

  if (showNoPermission) {
    return <NoPermission />;
  }

  return <>{children}</>;
};

export { ProtectedRoute };
