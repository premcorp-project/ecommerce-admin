'use client';

/**
 * Support Page Content — app/(public)/account/support/SupportPageContent.tsx
 *
 * Client component extracted from page.tsx to allow metadata export in the
 * server component page.
 *
 * Requirements: 9.1, 9.7, 9.10, 14.8
 */

import { AccountNav } from '@/components/public/account/AccountNav';
import { SupportTicketList } from '@/components/public/account/SupportTicketList';
import { usePublicMutation } from '@/lib/api/public-hooks';
import { publicQueryKeys } from '@/lib/api/public-query-keys';
import { useHydrated } from '@/lib/hooks/useHydrated';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useFormik } from 'formik';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import * as Yup from 'yup';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateTicketPayload {
    subject: string;
    message: string;
    orderId?: string;
}

// ─── Auth skeleton ────────────────────────────────────────────────────────────

function SupportPageSkeleton() {
    return (
        <div className="animate-pulse space-y-4" aria-hidden="true">
            <div className="h-8 w-48 rounded bg-muted" />
            {Array.from({ length: 3 }, (_, i) => (
                <div
                    key={i}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="h-4 w-48 rounded bg-muted" />
                        <div className="h-3 w-32 rounded bg-muted" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-20 rounded-full bg-muted" />
                        <div className="h-8 w-8 rounded-lg bg-muted" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Create Ticket Form ───────────────────────────────────────────────────────

interface CreateTicketFormProps {
    onClose: () => void;
}

function CreateTicketForm({ onClose }: CreateTicketFormProps) {
    const t = useTranslations('public.account');
    const queryClient = useQueryClient();

    const createMutation = usePublicMutation<unknown, CreateTicketPayload>(
        'post',
        '/support/tickets',
    );

    const validationSchema = Yup.object({
        subject: Yup.string()
            .trim()
            .required(t('validation.subjectRequired')),
        message: Yup.string()
            .trim()
            .required(t('validation.messageRequired')),
        orderId: Yup.string().trim(),
    });

    const formik = useFormik<CreateTicketPayload>({
        initialValues: { subject: '', message: '', orderId: '' },
        validationSchema,
        onSubmit: async (values, { resetForm }) => {
            const payload: CreateTicketPayload = {
                subject: values.subject,
                message: values.message,
            };
            if (values.orderId?.trim()) {
                payload.orderId = values.orderId.trim();
            }

            try {
                await createMutation.mutateAsync(payload);
                await queryClient.invalidateQueries({
                    queryKey: publicQueryKeys.tickets,
                });
                toast.success(t('ticketSubmitted'));
                resetForm();
                onClose();
            } catch {
                toast.error(t('ticketError'));
            }
        },
    });

    return (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
            {/* ── Form header ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-foreground">
                    {t('createTicketTitle')}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t('ticketStatusClosed')}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[36px] min-w-[36px]"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
                {/* Subject */}
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ticket-subject"
                        className="text-sm font-medium text-foreground"
                    >
                        {t('ticketSubject')}
                        <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <input
                        id="ticket-subject"
                        type="text"
                        placeholder={t('ticketSubject')}
                        {...formik.getFieldProps('subject')}
                        aria-invalid={!!(formik.touched.subject && formik.errors.subject)}
                        aria-describedby={
                            formik.touched.subject && formik.errors.subject
                                ? 'ticket-subject-error'
                                : undefined
                        }
                        className={cn(
                            'w-full rounded-lg border px-3 py-2.5 text-sm',
                            'bg-background text-foreground placeholder:text-muted-foreground',
                            'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                            formik.touched.subject && formik.errors.subject
                                ? 'border-destructive focus:ring-destructive'
                                : 'border-border',
                        )}
                    />
                    {formik.touched.subject && formik.errors.subject && (
                        <p id="ticket-subject-error" className="text-xs text-destructive" role="alert">
                            {formik.errors.subject}
                        </p>
                    )}
                </div>

                {/* Message */}
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ticket-message"
                        className="text-sm font-medium text-foreground"
                    >
                        {t('ticketMessage')}
                        <span className="text-destructive ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <textarea
                        id="ticket-message"
                        rows={5}
                        placeholder={t('ticketMessage')}
                        {...formik.getFieldProps('message')}
                        aria-invalid={!!(formik.touched.message && formik.errors.message)}
                        aria-describedby={
                            formik.touched.message && formik.errors.message
                                ? 'ticket-message-error'
                                : undefined
                        }
                        className={cn(
                            'w-full resize-none rounded-lg border px-3 py-2.5 text-sm',
                            'bg-background text-foreground placeholder:text-muted-foreground',
                            'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                            formik.touched.message && formik.errors.message
                                ? 'border-destructive focus:ring-destructive'
                                : 'border-border',
                        )}
                    />
                    {formik.touched.message && formik.errors.message && (
                        <p id="ticket-message-error" className="text-xs text-destructive" role="alert">
                            {formik.errors.message}
                        </p>
                    )}
                </div>

                {/* Order ID (optional) */}
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ticket-order"
                        className="text-sm font-medium text-foreground"
                    >
                        {t('ticketOrder')}
                    </label>
                    <input
                        id="ticket-order"
                        type="text"
                        placeholder={t('ticketOrderPlaceholder')}
                        {...formik.getFieldProps('orderId')}
                        className={cn(
                            'w-full rounded-lg border border-border px-3 py-2.5 text-sm',
                            'bg-background text-foreground placeholder:text-muted-foreground',
                            'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                        )}
                    />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            'inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium',
                            'border border-border bg-background text-foreground',
                            'hover:bg-muted transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            'min-h-[44px]',
                        )}
                    >
                        {t('ticketStatusClosed')}
                    </button>
                    <button
                        type="submit"
                        disabled={formik.isSubmitting}
                        aria-busy={formik.isSubmitting}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold',
                            'bg-primary text-primary-foreground',
                            'hover:bg-primary/90 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            'min-h-[44px]',
                        )}
                    >
                        {formik.isSubmitting ? t('ticketSubmitting') : t('ticketSubmit')}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── Exported content component ───────────────────────────────────────────────

export function SupportPageContent() {
    const t = useTranslations('public.account');
    const hydrated = useHydrated();
    const { user } = useCustomerAuthStore();
    const router = useRouter();
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Auth guard
    useEffect(() => {
        if (user === null) {
            router.replace('/login?redirect=/account/support');
        }
    }, [user, router]);

    // Show skeleton while auth resolves
    if (!hydrated || !user) {
        return (
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <SupportPageSkeleton />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* ── Page heading ──────────────────────────────────────────────── */}
            <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t('title')}
            </h1>

            {/* ── Responsive layout ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8 md:flex-row md:gap-10">
                <AccountNav />

                <main className="flex-1 min-w-0">
                    {/* ── Section header ─────────────────────────────────────── */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('supportTitle')}
                        </h2>
                        {!showCreateForm && (
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(true)}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                                    'text-sm font-semibold',
                                    'bg-primary text-primary-foreground',
                                    'hover:bg-primary/90 transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                    'min-h-[44px]',
                                )}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                {t('newTicket')}
                            </button>
                        )}
                    </div>

                    {/* ── Create ticket form ─────────────────────────────────── */}
                    {showCreateForm && (
                        <CreateTicketForm onClose={() => setShowCreateForm(false)} />
                    )}

                    {/* ── Ticket list ────────────────────────────────────────── */}
                    <SupportTicketList />
                </main>
            </div>
        </div>
    );
}
