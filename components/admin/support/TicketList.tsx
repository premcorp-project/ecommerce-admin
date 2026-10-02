'use client';

import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSortableData } from '@/hooks/use-sortable-data';

import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { DownloadButtons } from '@/components/shared/DownloadButtons';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer, TLimitType } from '@/components/shared/TableShimmer';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

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

interface Pagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface TicketListProps {
  items: Ticket[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  pagination: Pagination | undefined;
  canWrite: boolean;
  onSelectTicket: (ticketId: string) => void;
  limit: TLimitType;
}

// --- Constants ---

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-muted text-muted-foreground',
};

const DEFAULT_LIMIT: TLimitType = 25;

// --- Component ---

export default function TicketList({
  items: rawItems,
  isLoading,
  isError,
  refetch,
  pagination,
  canWrite,
  onSelectTicket,
  limit,
}: TicketListProps) {
  const t = useTranslations('admin.support');
  const tCommon = useTranslations('common');

  // Client-side sorting
  const { items, requestSort, sortConfig } = useSortableData<Ticket>(rawItems);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter configuration
  const filters: Filter[] = [
    {
      type: 'search',
      paramName: 'search',
      placeholder: t('searchPlaceholder'),
    },
    {
      type: 'select',
      paramName: 'status',
      placeholder: t('status'),
      options: [
        { key: t('statuses.open'), value: 'open' },
        { key: t('statuses.in_progress'), value: 'in_progress' },
        { key: t('statuses.resolved'), value: 'resolved' },
        { key: t('statuses.closed'), value: 'closed' },
      ],
    },
  ];

  const downloadColumns = [
    { header: t('subject'), dataKey: 'subject' },
    {
      header: t('user'),
      dataKey: 'user',
      formatter: (item: Ticket) => item.user?.name || 'N/A',
    },
    {
      header: 'Email',
      dataKey: 'user',
      formatter: (item: Ticket) => item.user?.email || 'N/A',
    },
    { header: t('status'), dataKey: 'status' },
    {
      header: t('created'),
      dataKey: 'createdAt',
      formatter: (item: Ticket) =>
        new Date(item.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>
      </div>

      <GlobalFilters filters={filters} />

      {items.length > 0 && (
        <DownloadButtons
          fileName="support_tickets_report"
          data={items}
          columns={downloadColumns}
        />
      )}

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-accent rounded-t-md">
            <TableRow>
              <TableHeaderCell
                label={t('subject')}
                sortKey="subject"
                requestSort={requestSort}
                sortConfig={sortConfig}
                containerClass="pl-4"
              />
              <TableHeaderCell
                label={t('user')}
                sortKey="user.name"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('status')}
                sortKey="status"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('created')}
                sortKey="createdAt"
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
              <TableHeaderCell
                label={t('actions')}
                sortKey=""
                requestSort={requestSort}
                sortConfig={sortConfig}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableShimmer limit={limit} columns={5} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t('failedToLoad')}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="text-sm text-primary underline"
                    >
                      {tCommon('retry')}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <NoDataFound title={t('noTickets')} />
                </TableCell>
              </TableRow>
            ) : (
              items.map((ticket) => (
                <TableRow
                  key={ticket._id}
                  className="!h-[55px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectTicket(ticket._id)}
                >
                  <TableCell className="pl-4">
                    <p className="font-medium text-sm">{ticket.subject}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {ticket.user?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.user?.email || ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] || 'bg-muted text-muted-foreground'}`}
                    >
                      {t(`statuses.${ticket.status}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </TableCell>
                  <TableCell>
                    <AppButton
                      variant="mute"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTicket(ticket._id);
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('view')}</span>
                    </AppButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 bg-accent/30 border-t rounded-b-md">
          {!isLoading && !isError && items.length > 0 && pagination && (
            <AppPagination
              page={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalData={pagination.totalCount}
              defaultLimit={DEFAULT_LIMIT}
            />
          )}
        </div>
      </div>
    </div>
  );
}
