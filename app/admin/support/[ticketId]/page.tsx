'use client';

import { use } from 'react';

import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import TicketDetail from '@/components/admin/support/TicketDetail';

// --- Component ---

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('support');

  return <TicketDetail ticketId={ticketId} canWrite={canWrite} />;
}
