'use client';

import { useQueryParams } from '@/hooks/use-query-params';
import { useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { useRouter } from 'next/navigation';

import TicketList from '@/components/admin/support/TicketList';

import { TLimitType } from '@/components/shared/TableShimmer';

// --- Types ---

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketUser {
  _id: string;
  name: string;
  email: string;
}

interface Ticket {
  _id: string;
  user: TicketUser;
  subject: string;
  status: TicketStatus;
  messages: { _id?: string; sender: string | { _id: string; name: string }; body: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

interface TicketsResponse {
  success: boolean;
  data: {
    tickets: Ticket[];
    pagination: {
      totalCount: number;
      totalPages: number;
      currentPage: number;
      perPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

// --- Constants ---

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function SupportPage() {
  const { getParam } = useQueryParams();
  const router = useRouter();
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('support');

  // Read filter/pagination state from URL query params
  const page = Number(getParam('page')) || 1;
  const limit = (Number(getParam('limit')) || DEFAULT_LIMIT) as TLimitType;
  const search = getParam('search') || '';
  const status = getParam('status') || '';

  // Build query params
  const queryParams = {
    page,
    limit,
    ...(search && { search }),
    ...(status && { status }),
  };

  // Fetch tickets list
  const { data, isLoading, isError, refetch } = useAdminQuery<TicketsResponse>(
    adminQueryKeys.support(queryParams),
    '/support/tickets',
    {
      placeholderData: (previousData) => previousData,
    },
    { params: queryParams },
  );

  const tickets = data?.data?.tickets ?? [];
  const pagination = data?.data?.pagination;

  return (
    <TicketList
      items={tickets}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      pagination={pagination}
      canWrite={canWrite}
      onSelectTicket={(id) => router.push(`/admin/support/${id}`)}
      limit={limit}
    />
  );
}
