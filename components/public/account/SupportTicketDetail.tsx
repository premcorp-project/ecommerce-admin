'use client';

/**
 * SupportTicketDetail — renders a single support ticket with its message thread.
 *
 * - Accepts `ticketId: string` prop
 * - Fetches GET /support/tickets/:ticketId via usePublicQuery
 * - Renders message thread: each message shows sender label (You / Support),
 *   message text, and timestamp
 * - Shows reply form (Formik + Yup, textarea) only when ticket status is
 *   `open` or `in_progress`
 * - Submits reply via POST /support/tickets/:ticketId/messages
 * - Invalidates ['public', 'ticket', ticketId] and ['public', 'tickets'] on success
 * - Shows skeleton while loading
 * - All strings via t('public.account.*')
 *
 * Requirements: 9.8
 */

import { usePublicMutation, usePublicQuery } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { cn } from '@/lib/utils';
import type { Ticket, TicketMessage } from '@/types/public';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { AlertCircle, RefreshCw, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketDetailApiResponse {
    success: boolean;
    data: Ticket;
}

interface ReplyPayload {
    body: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TicketDetailSkeleton() {
    return (
        <div className="flex flex-col gap-4 animate-pulse" aria-busy="true" aria-hidden="true">
            {/* Header skeleton */}
            <div className="flex flex-col gap-2 pb-4 border-b border-border">
                <div className="h-6 w-64 rounded bg-muted" />
                <div className="h-4 w-24 rounded-full bg-muted" />
            </div>
            {/* Message skeletons */}
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className={cn(
                        'flex flex-col gap-1.5 max-w-[75%] rounded-xl p-4',
                        i % 2 === 0 ? 'self-end bg-muted' : 'self-start bg-muted',
                    )}
                >
                    <div className="h-3 w-16 rounded bg-muted-foreground/20" />
                    <div className="h-4 w-48 rounded bg-muted-foreground/20" />
                    <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                </div>
            ))}
        </div>
    );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
    message: TicketMessage;
    isCustomer: boolean;
}

function MessageBubble({ message, isCustomer }: MessageBubbleProps) {
    const t = useTranslations('public.account');

    const formattedDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(message.sentAt ?? message.createdAt ?? Date.now()));

    return (
        <div
            className={cn(
                'flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]',
                isCustomer ? 'self-end items-end' : 'self-start items-start',
            )}
        >
            {/* Sender label */}
            <span className="text-xs font-medium text-muted-foreground px-1">
                {isCustomer ? t('ticketSenderYou') : t('ticketSenderSupport')}
            </span>

            {/* Bubble */}
            <div
                className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    isCustomer
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm',
                )}
            >
                {message.body ?? message.message}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground px-1">{formattedDate}</span>
        </div>
    );
}

// ─── Reply form ───────────────────────────────────────────────────────────────

interface ReplyFormProps {
    ticketId: string;
}

function ReplyForm({ ticketId }: ReplyFormProps) {
    const t = useTranslations('public.account');
    const queryClient = useQueryClient();

    const replyMutation = usePublicMutation<unknown, ReplyPayload>(
        'post',
        `/support/tickets/${ticketId}/messages`,
    );

    const validationSchema = Yup.object({
        body: Yup.string()
            .trim()
            .required(t('validation.messageRequired'))
            .min(1, t('validation.messageRequired')),
    });

    const formik = useFormik<ReplyPayload>({
        initialValues: { body: '' },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                await replyMutation.mutateAsync(values);
                // Invalidate both the ticket detail and the tickets list
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: publicQueryKeys.ticket(ticketId),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: publicQueryKeys.tickets,
                    }),
                ]);
                resetForm();
                toast.success(t('ticketReplied'));
            } catch {
                // onError already handled by mutation; swallow rejection
                toast.error(t('ticketReplyError'));
            }
        },
    });

    return (
        <form
            onSubmit={formik.handleSubmit}
            noValidate
            className="flex flex-col gap-3 pt-4 border-t border-border"
        >
            <label
                htmlFor="ticket-reply"
                className="text-sm font-medium text-foreground"
            >
                {t('ticketReply')}
            </label>

            <textarea
                id="ticket-reply"
                rows={4}
                placeholder={t('ticketReplyPlaceholder')}
                {...formik.getFieldProps('body')}
                aria-invalid={!!(formik.touched.body && formik.errors.body)}
                aria-describedby={
                    formik.touched.body && formik.errors.body
                        ? 'ticket-reply-error'
                        : undefined
                }
                className={cn(
                    'w-full resize-none rounded-lg border px-3 py-2.5 text-sm',
                    'bg-background text-foreground placeholder:text-muted-foreground',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                    formik.touched.body && formik.errors.body
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-border',
                )}
            />

            {formik.touched.body && formik.errors.body && (
                <p id="ticket-reply-error" className="text-xs text-destructive" role="alert">
                    {formik.errors.body}
                </p>
            )}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={formik.isSubmitting || !formik.dirty}
                    aria-busy={formik.isSubmitting}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-5 py-2.5',
                        'text-sm font-semibold',
                        'bg-primary text-primary-foreground',
                        'hover:bg-primary/90 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'min-h-[44px]',
                    )}
                >
                    <Send className="size-4" aria-hidden="true" />
                    {formik.isSubmitting ? t('ticketReplying') : t('ticketReply')}
                </button>
            </div>
        </form>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SupportTicketDetailProps {
    ticketId: string;
}

export function SupportTicketDetail({ ticketId }: SupportTicketDetailProps) {
    const t = useTranslations('public.account');
    const tc = useTranslations('public.common');
    const { user } = useCustomerAuthStore();

    const { data, isLoading, isError, refetch } = usePublicQuery<TicketDetailApiResponse>(
        publicQueryKeys.ticket(ticketId),
        `/support/tickets/${ticketId}`,
        { staleTime: 1000 * 60 },
    );

    // Unwrap response envelope: { success, data: { ticket: {...} } }
    const ticket: Ticket | null = (data as any)?.data?.ticket ?? (data as any)?.data ?? null;

    // ── Loading state ──────────────────────────────────────────────────────────
    if (isLoading) {
        return <TicketDetailSkeleton />;
    }

    // ── Error state ────────────────────────────────────────────────────────────
    if (isError || !ticket) {
        return (
            <section className="flex flex-col items-center gap-4 py-12 text-center">
                <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                    <p className="font-semibold text-foreground">{tc('error')}</p>
                    <p className="text-sm text-muted-foreground">{tc('errorHint')}</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                        'text-sm font-medium',
                        'bg-primary text-primary-foreground',
                        'hover:bg-primary/90 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    )}
                >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {tc('errorRetry')}
                </button>
            </section>
        );
    }

    const canReply = ticket.status === 'open' || ticket.status === 'in_progress';

    return (
        <section aria-labelledby="ticket-subject">
            {/* ── Ticket header ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
                <h2
                    id="ticket-subject"
                    className="text-lg font-semibold text-foreground"
                >
                    {ticket.subject}
                </h2>
                <span
                    className={cn(
                        'inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        ticket.status === 'open'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : ticket.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                    )}
                >
                    {ticket.status === 'open'
                        ? t('ticketStatusOpen')
                        : ticket.status === 'in_progress'
                          ? t('ticketStatusInProgress')
                          : t('ticketStatusClosed')}
                </span>
            </div>

            {/* ── Message thread ─────────────────────────────────────────────── */}
            <div
                className="flex flex-col gap-4 min-h-[200px] mb-6"
                role="log"
                aria-label={t('supportTitle')}
                aria-live="polite"
            >
                {(ticket.messages ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        {t('noTicketsHint')}
                    </p>
                ) : (
                    (ticket.messages ?? []).map((message) => (
                        <MessageBubble
                            key={message._id}
                            message={message}
                            isCustomer={
                                typeof message.sender === 'string'
                                    ? message.sender === user?._id
                                    : (message.sender as any)?._id === user?._id
                            }
                        />
                    ))
                )}
            </div>

            {/* ── Reply form (only for open/in_progress tickets) ─────────────── */}
            {canReply && <ReplyForm ticketId={ticketId} />}

            {/* ── Closed notice ──────────────────────────────────────────────── */}
            {!canReply && (
                <p className="text-sm text-muted-foreground text-center py-4 border-t border-border">
                    {t('ticketStatusClosed')}
                </p>
            )}
        </section>
    );
}

export default SupportTicketDetail;
