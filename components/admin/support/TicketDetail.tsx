'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Clock, MessageSquare, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import MessageInput from './MessageInput';
import MessageThread from './MessageThread';

// --- Types ---

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketMessage {
  _id?: string;
  sender: string | { _id: string; name: string };
  body: string;
  createdAt: string;
}

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
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailResponse {
  success: boolean;
  data: Ticket;
}

interface StatusUpdateVariables {
  ticketId: string;
  status: TicketStatus;
}

interface SendMessageVariables {
  ticketId: string;
  body: string;
}

interface TicketDetailProps {
  ticketId: string;
  canWrite: boolean;
  onBack?: () => void;
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

// --- Component ---

export default function TicketDetail({
  ticketId,
  canWrite,
  onBack,
}: TicketDetailProps) {
  const t = useTranslations('admin.support');
  const queryClient = useQueryClient();
  const adminUser = useAdminAuthStore((state) => state.user);

  // Fetch single ticket detail
  const { data: ticketDetailData, isLoading: isLoadingDetail } =
    useAdminQuery<TicketDetailResponse>(
      ['admin', 'support', 'detail', ticketId],
      `/support/tickets/${ticketId}`,
      {
        enabled: !!ticketId,
      },
    );

  const ticketDetail: Ticket | null = (ticketDetailData as any)?.data?.ticket ?? (ticketDetailData as any)?.data ?? ticketDetailData?.data ?? null;

  // Status update mutation
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useAdminMutation<{ success: boolean }, StatusUpdateVariables>(
      'put',
      (variables) => `/support/tickets/${variables.ticketId}/status`,
      {
        onSuccess: () => {
          toast.success(t('statusUpdated'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
        },
        onError: () => {
          toast.error(t('statusUpdateFailed'));
        },
      },
    );

  // Send message mutation
  const { mutateAsync: sendMessage, isPending: isSendingMessage } =
    useAdminMutation<{ success: boolean }, SendMessageVariables>(
      'post',
      (variables) => `/support/tickets/${variables.ticketId}/messages`,
      {
        onSuccess: () => {
          toast.success(t('messageSent'));
          queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
        },
        onError: () => {
          toast.error(t('messageSendFailed'));
        },
      },
    );

  // Handlers
  const handleStatusChange = async (newStatus: TicketStatus) => {
    await updateStatus({ ticketId, status: newStatus });
  };

  const handleSendMessage = async (body: string) => {
    await sendMessage({ ticketId, body });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{t('ticketDetails')}</h1>
      </div>

      {isLoadingDetail ? (
        <div className="rounded-md border bg-card p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/4 mx-auto" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      ) : ticketDetail ? (
        <div className="space-y-4">
          {/* Ticket Info Card */}
          <div className="rounded-md border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {ticketDetail.subject}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>{ticketDetail.user?.name}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>{ticketDetail.user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {t('created')} {formatDate(ticketDetail.createdAt)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {canWrite ? (
                  <Select
                    value={ticketDetail.status}
                    onValueChange={(value) =>
                      handleStatusChange(value as TicketStatus)
                    }
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ['open', 'in_progress', 'resolved', 'closed'] as const
                      ).map((statusKey) => (
                        <SelectItem key={statusKey} value={statusKey}>
                          {t(`statuses.${statusKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticketDetail.status]}`}
                  >
                    {t(`statuses.${ticketDetail.status}`)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message Thread */}
          <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('messages')} ({ticketDetail.messages?.length || 0})
              </h3>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              <MessageThread
                messages={ticketDetail.messages || []}
                adminUserId={adminUser?._id}
              />
            </div>

            {/* Message Input */}
            {canWrite && (
              <MessageInput
                onSend={handleSendMessage}
                isLoading={isSendingMessage}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('ticketNotFound')}</p>
        </div>
      )}
    </div>
  );
}
