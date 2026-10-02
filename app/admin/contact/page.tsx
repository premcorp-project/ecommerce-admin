'use client';

/**
 * Admin Contact Messages Page — /admin/contact
 *
 * Lists contact form submissions with status management.
 * Uses a Sheet (slide-out drawer) to show message details — no scrolling needed.
 * Fetches GET /config/contact/messages with filters.
 * Actions: Mark as Read, Resolve, Delete.
 */

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer } from '@/components/shared/TableShimmer';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table, TableBody, TableCell, TableHeader, TableRow,
} from '@/components/ui/table';
import { useQueryParams } from '@/hooks/use-query-params';
import { useSortableData } from '@/hooks/use-sortable-data';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Eye, Mail, Phone, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactMessage {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    status: 'unread' | 'read' | 'resolved';
    createdAt: string;
}

interface MessagesResponse {
    success: boolean;
    data: {
        messages: ContactMessage[];
        pagination: { totalCount: number; totalPages: number; currentPage: number; perPage: number; hasNextPage: boolean; hasPrevPage: boolean };
    };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    unread: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    read: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

// ─── Message Detail Sheet ─────────────────────────────────────────────────────

interface MessageSheetProps {
    message: ContactMessage | null;
    open: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    isUpdating: boolean;
    t: ReturnType<typeof useTranslations<'admin.contact'>>;
}

function MessageSheet({ message, open, onClose, onStatusChange, onDelete, isUpdating, t }: MessageSheetProps) {
    if (!message) return null;

    const formattedDate = new Date(message.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
                <SheetHeader className="pb-0 mb-4">
                    <SheetTitle className="text-lg leading-snug">{message.subject}</SheetTitle>
                    {/* Status + Date */}
                    <div className="flex items-center gap-3 pt-2">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[message.status])}>
                            {t(`statuses.${message.status}` as any)}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {formattedDate}
                        </span>
                    </div>
                </SheetHeader>

                <Separator className="mb-5" />

                {/* Sender info */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <User className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{message.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{message.email}</p>
                    </div>
                </div>
                {message.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5 ml-[52px]">
                        <Phone className="size-3.5 shrink-0" />
                        {message.phone}
                    </div>
                )}
                {!message.phone && <div className="mb-5" />}

                {/* Message body */}
                <div className="rounded-lg border bg-muted/30 p-4 mb-6">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {message.message}
                    </p>
                </div>

                {/* Actions */}
                <Separator className="mb-4" />
                <div className="flex flex-wrap gap-2">
                    {message.status === 'unread' && (
                        <AppButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onStatusChange(message._id, 'read')}
                            disabled={isUpdating}
                            leftIcon={<Eye className="size-3.5" />}
                        >
                            {t('actions.markRead')}
                        </AppButton>
                    )}
                    {message.status !== 'resolved' && (
                        <AppButton
                            variant="primary"
                            size="sm"
                            onClick={() => onStatusChange(message._id, 'resolved')}
                            disabled={isUpdating}
                            leftIcon={<CheckCircle className="size-3.5" />}
                        >
                            {t('actions.resolve')}
                        </AppButton>
                    )}
                    <a
                        href={`mailto:${message.email}?subject=Re: ${message.subject}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors min-h-[32px]"
                    >
                        <Mail className="size-3.5" />
                        {t('actions.reply')}
                    </a>
                    <AppButton
                        variant="red"
                        size="sm"
                        onClick={() => onDelete(message._id)}
                        leftIcon={<Trash2 className="size-3.5" />}
                        className="ml-auto"
                    >
                        {t('actions.delete')}
                    </AppButton>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactMessagesPage() {
    const t = useTranslations('admin.contact');
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const { getParam } = useQueryParams();

    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const page = Number(getParam('page')) || 1;
    const limit = Number(getParam('limit')) || 25;
    const status = getParam('status') || '';
    const search = getParam('search') || '';

    const queryParams = { page, limit, ...(status && { status }), ...(search && { search }) };

    const { data, isLoading, isError, refetch } = useAdminQuery<MessagesResponse>(
        ['admin', 'contact-messages', queryParams],
        '/config/contact/messages',
        {},
        { params: queryParams },
    );

    const messages = data?.data?.messages ?? [];
    const pagination = data?.data?.pagination;
    const { items, requestSort, sortConfig } = useSortableData(messages);

    // Mutations
    const { mutateAsync: updateStatus, isPending: isUpdating } = useAdminMutation<any, { id: string; status: string }>(
        'put',
        (v) => `/config/contact/messages/${v.id}`,
    );

    const { mutateAsync: deleteMessage, isPending: isDeleting } = useAdminMutation<any, { id: string }>(
        'delete',
        (v) => `/config/contact/messages/${v.id}`,
    );

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateStatus({ id, status: newStatus });
            toast.success(t('toast.statusUpdated'));
            queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
            // Update the selected message in the sheet
            if (selectedMessage?._id === id) {
                setSelectedMessage({ ...selectedMessage, status: newStatus as any });
            }
        } catch { toast.error(t('toast.updateFailed')); }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteMessage({ id: deletingId });
            toast.success(t('toast.deleted'));
            queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
            if (selectedMessage?._id === deletingId) setSelectedMessage(null);
            setDeletingId(null);
        } catch { toast.error(t('toast.deleteFailed')); }
    };

    const handleDeleteFromSheet = (id: string) => {
        setSelectedMessage(null);
        setDeletingId(id);
    };

    const filters: Filter[] = [
        { type: 'search', paramName: 'search', placeholder: t('searchPlaceholder') },
        {
            type: 'select', paramName: 'status', placeholder: t('filterStatus'),
            options: [
                { key: t('statuses.all'), value: '' },
                { key: t('statuses.unread'), value: 'unread' },
                { key: t('statuses.read'), value: 'read' },
                { key: t('statuses.resolved'), value: 'resolved' },
            ],
        },
    ];

    return (
        <div className="space-y-4 p-4">
            <h1 className="text-2xl font-semibold">{t('title')}</h1>

            <GlobalFilters filters={filters} />

            <div className="rounded-md border overflow-auto">
                <Table className="min-w-[700px]">
                    <TableHeader className="bg-accent rounded-t-md">
                        <TableRow>
                            <TableHeaderCell label={t('columns.name')} sortKey="name" requestSort={requestSort} sortConfig={sortConfig} containerClass="pl-4" />
                            <TableHeaderCell label={t('columns.email')} sortKey="email" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.subject')} sortKey="subject" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.status')} sortKey="status" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.date')} sortKey="createdAt" requestSort={requestSort} sortConfig={sortConfig} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableShimmer limit={limit as any} columns={5} />
                        ) : isError ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">
                                <p className="text-sm text-muted-foreground">{t('failedToLoad')}</p>
                                <button onClick={() => refetch()} className="text-sm text-primary underline mt-1">{tCommon('retry')}</button>
                            </TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={5}><NoDataFound title={t('noMessages')} /></TableCell></TableRow>
                        ) : items.map((msg) => (
                            <TableRow
                                key={msg._id}
                                className={cn(
                                    'cursor-pointer hover:bg-muted/30 transition-colors',
                                    msg.status === 'unread' && 'bg-primary/[0.02] font-medium',
                                )}
                                onClick={() => {
                                    setSelectedMessage(msg);
                                    // Auto-mark as read when opening
                                    if (msg.status === 'unread') handleStatusChange(msg._id, 'read');
                                }}
                            >
                                <TableCell className="pl-4 text-sm font-medium">{msg.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{msg.email}</TableCell>
                                <TableCell className="text-sm max-w-[200px] truncate">{msg.subject}</TableCell>
                                <TableCell>
                                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[msg.status])}>
                                        {t(`statuses.${msg.status}` as any)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!isLoading && !isError && pagination && (
                    <div className="p-3 bg-accent/30 border-t">
                        <AppPagination page={pagination.currentPage} totalPages={pagination.totalPages} totalData={pagination.totalCount} defaultLimit={25} />
                    </div>
                )}
            </div>

            {/* Message detail drawer */}
            <MessageSheet
                message={selectedMessage}
                open={!!selectedMessage}
                onClose={() => setSelectedMessage(null)}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteFromSheet}
                isUpdating={isUpdating}
                t={t}
            />

            {/* Delete confirmation */}
            <AppAlertDialog
                open={!!deletingId}
                onOpenChange={(open) => { if (!open) setDeletingId(null); }}
                title={t('deleteTitle')}
                subTitle={t('deleteDescription')}
                confirmLabel={tCommon('delete')}
                onConfirm={handleDelete}
                loading={isDeleting}
                variant="delete"
            />
        </div>
    );
}
