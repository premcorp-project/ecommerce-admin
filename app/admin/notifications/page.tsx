'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import BroadcastForm from '@/components/admin/notifications/BroadcastForm';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

export default function NotificationsPage() {
  const t = useTranslations('admin.notifications');
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('notifications');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
      </div>

      <BroadcastForm canWrite={canWrite} />
    </div>
  );
}
