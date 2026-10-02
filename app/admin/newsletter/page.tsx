'use client';

/**
 * Admin Newsletter Subscribers Page — /admin/newsletter
 *
 * Lists newsletter subscribers with status filter and CSV export.
 * Fetches GET /config/newsletter/subscribers.
 */

import { AppButton } from '@/components/shared/AppButton';
import AppPagination from '@/components/shared/AppPagination';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer } from '@/components/shared/TableShimmer';
import {
    Table, TableBody, TableCell, TableHeader, TableRow,
} from '@/components/ui/table';
import { useQueryParams } from '@/hooks/use-query-params';
import { useSortableData } from '@/hooks/use-sortable-data';
import { useAdminQuery } from '@/lib/api/admin-hooks';
import { cn } from '@/lib/utils';
import { Download, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscriber {
    _id: string;
    email: string;
    name?: string;
    isActive: boolean;
    subscribedAt: string;
}

interface SubscribersResponse {
    success: boolean;
    data: {
        subscribers: Subscriber[];
        pagination: { totalCount: number; totalPages: number; currentPage: number; perPage: number; hasNextPage: boolean; hasPrevPage: boolean };
        totalActive?: number;
        totalUnsubscribed?: number;
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsletterPage() {
    const t = useTranslations('admin.newsletter');
    const tCommon = useTranslations('common');
    const { getParam } = useQueryParams();

    const page = Number(getParam('page')) || 1;
    const limit = Number(getParam('limit')) || 50;
    const active = getParam('active') || '';
    const search = getParam('search') || '';

    const queryParams = { page, limit, ...(active && { active }), ...(search && { search }) };

    const { data, isLoading, isError, refetch } = useAdminQuery<SubscribersResponse>(
        ['admin', 'newsletter-subscribers', queryParams],
        '/config/newsletter/subscribers',
        {},
        { params: queryParams },
    );

    const subscribers = data?.data?.subscribers ?? [];
    const pagination = data?.data?.pagination;
    const totalActive = data?.data?.totalActive ?? 0;
    const { items, requestSort, sortConfig } = useSortableData(subscribers);

    // CSV export
    const handleExportCsv = () => {
        if (items.length === 0) return;
        const headers = ['Email', 'Name', 'Status', 'Subscribed Date'];
        const rows = items.map((s) => [
            s.email,
            s.name || '',
            s.isActive ? 'Active' : 'Unsubscribed',
            new Date(s.subscribedAt).toLocaleDateString('en-GB'),
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'newsletter_subscribers.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const filters: Filter[] = [
        { type: 'search', paramName: 'search', placeholder: t('searchPlaceholder') },
        {
            type: 'select', paramName: 'active', placeholder: t('filterStatus'),
            options: [
                { key: t('statuses.all'), value: '' },
                { key: t('statuses.active'), value: 'true' },
                { key: t('statuses.unsubscribed'), value: 'false' },
            ],
        },
    ];

    return (
        <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{t('title')}</h1>
                {items.length > 0 && (
                    <AppButton variant="mute" size="sm" onClick={handleExportCsv}>
                        <Download className="size-4" />
                        {t('exportCsv')}
                    </AppButton>
                )}
            </div>

            {/* Stat card */}
            {!isLoading && totalActive > 0 && (
                <div className="inline-flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                    <Users className="size-5 text-primary" />
                    <div>
                        <p className="text-lg font-bold text-foreground">{totalActive}</p>
                        <p className="text-xs text-muted-foreground">{t('activeSubscribers')}</p>
                    </div>
                </div>
            )}

            <GlobalFilters filters={filters} />

            <div className="rounded-md border overflow-auto">
                <Table className="min-w-[600px]">
                    <TableHeader className="bg-accent rounded-t-md">
                        <TableRow>
                            <TableHeaderCell label={t('columns.email')} sortKey="email" requestSort={requestSort} sortConfig={sortConfig} containerClass="pl-4" />
                            <TableHeaderCell label={t('columns.name')} sortKey="name" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.status')} sortKey="isActive" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.subscribedDate')} sortKey="subscribedAt" requestSort={requestSort} sortConfig={sortConfig} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableShimmer limit={limit as any} columns={4} />
                        ) : isError ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">
                                <p className="text-sm text-muted-foreground">{t('failedToLoad')}</p>
                                <button onClick={() => refetch()} className="text-sm text-primary underline mt-1">{tCommon('retry')}</button>
                            </TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow><TableCell colSpan={4}><NoDataFound title={t('noSubscribers')} /></TableCell></TableRow>
                        ) : items.map((sub) => (
                            <TableRow key={sub._id}>
                                <TableCell className="pl-4 text-sm font-medium">{sub.email}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{sub.name || '—'}</TableCell>
                                <TableCell>
                                    <span className={cn(
                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        sub.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-muted text-muted-foreground',
                                    )}>
                                        {sub.isActive ? t('statuses.active') : t('statuses.unsubscribed')}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(sub.subscribedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {!isLoading && !isError && pagination && (
                    <div className="p-3 bg-accent/30 border-t">
                        <AppPagination page={pagination.currentPage} totalPages={pagination.totalPages} totalData={pagination.totalCount} defaultLimit={50} />
                    </div>
                )}
            </div>
        </div>
    );
}
