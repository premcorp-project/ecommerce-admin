'use client';

/**
 * Admin Testimonials Page — /admin/testimonials
 *
 * CRUD management for customer testimonials displayed on the homepage.
 * Fetches GET /config/testimonials/all (includes inactive).
 * Create/Edit via Sheet drawer. Delete with confirmation.
 * Active toggle inline.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik } from 'formik';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { AppButton } from '@/components/shared/AppButton';
import NoDataFound from '@/components/shared/NoDataFound';
import { TableShimmer } from '@/components/shared/TableShimmer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  company: string;
  avatar: string | null;
  industry: string;
  quote: string;
  rating: number;
  isActive: boolean;
  position: number;
}

interface FormValues {
  name: string;
  role: string;
  company: string;
  avatar: string;
  industry: string;
  quote: string;
  rating: number;
  position: number;
  isActive: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  role: Yup.string().required('Role is required'),
  company: Yup.string(),
  avatar: Yup.string().url('Must be a valid URL').nullable(),
  industry: Yup.string(),
  quote: Yup.string()
    .required('Quote is required')
    .min(20, 'Quote must be at least 20 characters'),
  rating: Yup.number().min(1).max(5).required('Rating is required'),
  position: Yup.number().min(0),
  isActive: Yup.boolean(),
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestimonialsPage() {
  const t = useTranslations('admin.testimonials');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAdminQuery<any>(
    ['admin', 'testimonials'],
    '/config/testimonials/all',
  );

  const testimonials: Testimonial[] = (data as any)?.data?.testimonials ?? [];

  const { mutateAsync: createTestimonial, isPending: isCreating } =
    useAdminMutation<any, FormValues>('post', '/config/testimonials');
  const { mutateAsync: updateTestimonial, isPending: isUpdating } =
    useAdminMutation<any, FormValues & { _id: string }>(
      'put',
      (v) => `/config/testimonials/${v._id}`,
    );
  const { mutateAsync: deleteTestimonial, isPending: isDeleting } =
    useAdminMutation<any, { id: string }>(
      'delete',
      (v) => `/config/testimonials/${v.id}`,
    );

  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        avatar: values.avatar.trim() || undefined,
      };
      if (editingItem) {
        await updateTestimonial({ ...payload, _id: editingItem._id } as any);
        toast.success(t('toast.updated'));
      } else {
        await createTestimonial(payload as any);
        toast.success(t('toast.created'));
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      setSheetOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        t('toast.failed');
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteTestimonial({ id: deletingId });
      toast.success(t('toast.deleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      setDeletingId(null);
    } catch {
      toast.error(t('toast.failed'));
    }
  };

  const handleToggleActive = async (item: Testimonial) => {
    try {
      await updateTestimonial({
        ...item,
        _id: item._id,
        isActive: !item.isActive,
        avatar: item.avatar || undefined,
      } as any);
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      toast.success(t('toast.updated'));
    } catch {
      toast.error(t('toast.failed'));
    }
  };

  const openCreate = () => {
    setEditingItem(null);
    setSheetOpen(true);
  };
  const openEdit = (item: Testimonial) => {
    setEditingItem(item);
    setSheetOpen(true);
  };

  const initialValues: FormValues = editingItem
    ? {
        name: editingItem.name,
        role: editingItem.role,
        company: editingItem.company,
        avatar: editingItem.avatar ?? '',
        industry: editingItem.industry,
        quote: editingItem.quote,
        rating: editingItem.rating,
        position: editingItem.position,
        isActive: editingItem.isActive,
      }
    : {
        name: '',
        role: '',
        company: '',
        avatar: '',
        industry: '',
        quote: '',
        rating: 5,
        position: testimonials.length,
        isActive: true,
      };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <AppButton onClick={openCreate} leftIcon={<Plus className="size-4" />}>
          {t('addButton')}
        </AppButton>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-accent">
            <TableRow>
              <TableCell className="pl-4 text-xs font-medium text-muted-foreground">
                {t('columns.name')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.company')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.industry')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.rating')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.position')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.active')}
              </TableCell>
              <TableCell className="text-xs font-medium text-muted-foreground">
                {t('columns.actions')}
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableShimmer limit={5 as any} columns={7} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {t('failedToLoad')}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="text-sm text-primary underline mt-1"
                  >
                    {tCommon('retry')}
                  </button>
                </TableCell>
              </TableRow>
            ) : testimonials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <NoDataFound title={t('noData')} />
                </TableCell>
              </TableRow>
            ) : (
              testimonials.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="pl-4">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.role}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.company || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.industry || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'size-3.5',
                            i < item.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-muted',
                          )}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-center">
                    {item.position}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <AppButton
                        variant="mute"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-3.5" />
                      </AppButton>
                      <AppButton
                        variant="mute"
                        size="sm"
                        onClick={() => setDeletingId(item._id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </AppButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          if (!v) {
            setSheetOpen(false);
            setEditingItem(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-md overflow-y-auto p-6">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {editingItem ? t('editTitle') : t('addTitle')}
            </SheetTitle>
          </SheetHeader>
          <Formik
            key={editingItem?._id ?? 'new'}
            initialValues={initialValues}
            validationSchema={schema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              setFieldValue,
            }) => (
              <Form className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('form.name')}</Label>
                  <Input
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="James Thornton"
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="role">{t('form.role')}</Label>
                    <Input
                      id="role"
                      name="role"
                      value={values.role}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Production Manager"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">{t('form.company')}</Label>
                    <Input
                      id="company"
                      name="company"
                      value={values.company}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Thornton Engineering"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="industry">{t('form.industry')}</Label>
                    <Input
                      id="industry"
                      name="industry"
                      value={values.industry}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Manufacturing"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avatar">{t('form.avatar')}</Label>
                    <Input
                      id="avatar"
                      name="avatar"
                      value={values.avatar}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quote">{t('form.quote')}</Label>
                  <textarea
                    id="quote"
                    name="quote"
                    value={values.quote}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows={4}
                    placeholder="Their experience with OttimoDirect..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {touched.quote && errors.quote && (
                    <p className="text-xs text-destructive">{errors.quote}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('form.rating')}</Label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFieldValue('rating', i + 1)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={cn(
                              'size-5 transition-colors',
                              i < values.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted hover:text-yellow-400',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="position">{t('form.position')}</Label>
                    <Input
                      id="position"
                      name="position"
                      type="number"
                      min={0}
                      value={values.position}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">{t('form.active')}</Label>
                  <Switch
                    id="isActive"
                    checked={values.isActive}
                    onCheckedChange={(v) => setFieldValue('isActive', v)}
                  />
                </div>
                <div className="pt-2">
                  <AppButton
                    type="submit"
                    isLoading={isCreating || isUpdating}
                    className="w-full"
                  >
                    {editingItem ? t('form.update') : t('form.create')}
                  </AppButton>
                </div>
              </Form>
            )}
          </Formik>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AppAlertDialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
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
