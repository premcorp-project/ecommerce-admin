'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useQueryParams } from '@/hooks/use-query-params';
import { useSortableData } from '@/hooks/use-sortable-data';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';

import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import { Filter, GlobalFilters } from '@/components/shared/GlobalFilters';
import NoDataFound from '@/components/shared/NoDataFound';
import TableHeaderCell from '@/components/shared/TableHeaderCell';
import { TableShimmer } from '@/components/shared/TableShimmer';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import TagForm from '@/components/admin/forms/TagForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tag {
    _id: string;
    name: string;
    slug: string;
    description?: string;
    image?: { url: string; publicId: string } | null;
    isActive: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TagsPage() {
    const t = useTranslations('admin.tags');
    const queryClient = useQueryClient();
    const canWrite = useAdminAuthStore((s) => s.hasWriteAccess)('catalog');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [deletingTag, setDeletingTag] = useState<Tag | null>(null);

    const { getParam } = useQueryParams();
    const search = getParam('search') || '';

    const { data, isLoading, isError, refetch } = useAdminQuery<any>(
        adminQueryKeys.tags(),
        '/catalog/tags/all',
    );

    const tags: Tag[] = (data as any)?.data?.tags ?? (data as any)?.tags ?? [];
    const filtered = search
        ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
        : tags;

    const { items, requestSort, sortConfig } = useSortableData<Tag>(filtered);

    const { mutateAsync: deleteTag, isPending: isDeleting } = useAdminMutation<any, { id: string }>(
        'delete',
        (v) => `/catalog/tags/${v.id}`,
        {
            onSuccess: () => {
                toast.success(t('toast.deleteSuccess'));
                queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
                setDeletingTag(null);
            },
            onError: () => toast.error(t('toast.deleteFailed')),
        },
    );

    const { mutateAsync: updateTag } = useAdminMutation<any, { id: string; isActive: boolean }>(
        'put',
        (v) => `/catalog/tags/${v.id}`,
        {
            onSuccess: () => {
                toast.success(t('toast.statusUpdated'));
                queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
            },
        },
    );

    const filters: Filter[] = [
        { type: 'search', paramName: 'search', placeholder: t('searchPlaceholder') },
    ];

    return (
        <>
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{t('title')}</h1>
                    {canWrite && (
                        <AppButton onClick={() => { setEditingTag(null); setSheetOpen(true); }} leftIcon={<Plus size={16} />}>
                            {t('addTag')}
                        </AppButton>
                    )}
                </div>

                <GlobalFilters filters={filters} />

                <div className="rounded-md border overflow-auto">
                <Table className="min-w-[700px]">
                    <TableHeader className="bg-accent rounded-t-md">
                        <TableRow>
                            <TableHead>{t('columns.image')}</TableHead>
                            <TableHeaderCell label={t('columns.name')} sortKey="name" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHeaderCell label={t('columns.slug')} sortKey="slug" requestSort={requestSort} sortConfig={sortConfig} />
                            <TableHead>{t('columns.active')}</TableHead>
                            <TableHead>{t('columns.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableShimmer columns={5} limit={10} />
                        ) : isError ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-destructive">{t('failedToLoad')}</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5}><NoDataFound /></TableCell></TableRow>
                        ) : (
                            items.map((tag) => (
                                <TableRow key={tag._id}>
                                    <TableCell>
                                        {tag.image?.url ? (
                                            <img src={tag.image.url} alt={tag.name} className="size-8 rounded object-contain bg-muted" />
                                        ) : (
                                            <div className="size-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{tag.name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{tag.slug}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={tag.isActive}
                                            onCheckedChange={(checked) => updateTag({ id: tag._id, isActive: checked })}
                                            disabled={!canWrite}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1.5 rounded hover:bg-muted"><MoreHorizontal size={16} /></button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => { setEditingTag(tag); setSheetOpen(true); }}>
                                                    <Edit size={14} className="mr-2" /> {t('editTag')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTag(tag)}>
                                                    <Trash2 size={14} className="mr-2" /> {t('deleteTag')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </div>
            </div>

            {deletingTag && (
                <AppAlertDialog
                    open={!!deletingTag}
                    onOpenChange={(open) => !open && setDeletingTag(null)}
                    title={t('deleteTag')}
                    subTitle={t('deleteConfirm', { name: deletingTag.name })}
                    description={t('deleteDescription')}
                    variant="delete"
                    confirmLabel={t('deleteTag')}
                    onConfirm={() => deleteTag({ id: deletingTag._id })}
                    loading={isDeleting}
                />
            )}

            <TagForm
                open={sheetOpen}
                item={editingTag}
                onSuccess={() => { setSheetOpen(false); setEditingTag(null); }}
                onClose={() => { setSheetOpen(false); setEditingTag(null); }}
            />
        </>
    );
}
