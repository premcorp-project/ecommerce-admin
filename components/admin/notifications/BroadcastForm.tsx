'use client';

import { Form, Formik } from 'formik';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import toast from 'react-hot-toast';
import * as Yup from 'yup';

import { AppButton } from '@/components/shared/AppButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminMutation } from '@/lib/api/admin-hooks';

// --- Types ---

interface BroadcastPayload {
  title: string;
  body: string;
  target: string;
  image?: string;
  belowVersion?: string;
  data?: { url?: string };
}

interface BroadcastFormValues {
  title: string;
  body: string;
  target: string;
  image: string;
  belowVersion: string;
  deepLinkUrl: string;
}

interface BroadcastFormProps {
  canWrite: boolean;
}

// --- Constants ---

const TARGET_KEYS = [
  'all',
  'customers',
  'bulk_buyers',
  'cod_enabled',
  'verified',
  'staff',
] as const;

// --- Component ---

export default function BroadcastForm({ canWrite }: BroadcastFormProps) {
  const t = useTranslations('admin.notifications');
  const [lastResult, setLastResult] = useState<{ sent: number; segment: string } | null>(null);

  // --- Validation ---
  const broadcastSchema = Yup.object().shape({
    title: Yup.string()
      .required(t('validation.titleRequired'))
      .max(100, t('validation.titleMax')),
    body: Yup.string()
      .required(t('validation.bodyRequired'))
      .max(500, t('validation.bodyMax')),
    target: Yup.string().required(t('validation.targetRequired')),
    image: Yup.string().url(t('validation.imageUrl')).optional(),
    belowVersion: Yup.string().optional(),
    deepLinkUrl: Yup.string().optional(),
  });

  const { mutateAsync: sendBroadcast, isPending } = useAdminMutation<
    { success: boolean; data: { sent: number; segment: string } },
    BroadcastPayload
  >('post', '/notifications/broadcast');

  const handleSubmit = async (
    values: BroadcastFormValues,
    { resetForm }: { resetForm: () => void },
  ) => {
    const payload: BroadcastPayload = {
      title: values.title,
      body: values.body,
      target: values.target,
    };

    if (values.image.trim()) {
      payload.image = values.image.trim();
    }
    if (values.belowVersion.trim()) {
      payload.belowVersion = values.belowVersion.trim();
    }
    if (values.deepLinkUrl.trim()) {
      payload.data = { url: values.deepLinkUrl.trim() };
    }

    try {
      const result = await sendBroadcast(payload);
      const data = (result as any)?.data ?? result;
      setLastResult({ sent: data.sent, segment: data.segment });
      toast.success(t('toast.sendSuccess', { count: data.sent }));
      resetForm();
    } catch (err) {
      const message = (err as any)?.response?.data?.message;
      toast.error(message || t('toast.sendFailed'));
    }
  };

  return (
    <div className="max-w-lg">
      <div className="rounded-md border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">{t('broadcast')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('broadcastDescription')}
          </p>
        </div>

        {!canWrite ? (
          <p className="text-sm text-muted-foreground">
            {t('noPermission')}
          </p>
        ) : (
          <Formik
            initialValues={{
              title: '',
              body: '',
              target: 'all',
              image: '',
              belowVersion: '',
              deepLinkUrl: '',
            }}
            validationSchema={broadcastSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
              <Form className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-title">{t('form.title')} *</Label>
                  <Input
                    id="notif-title"
                    name="title"
                    placeholder={t('form.titlePlaceholder')}
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.title && errors.title)}
                  />
                  {touched.title && errors.title && (
                    <p className="text-xs text-destructive">{errors.title}</p>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-body">{t('form.body')} *</Label>
                  <Textarea
                    id="notif-body"
                    name="body"
                    placeholder={t('form.bodyPlaceholder')}
                    value={values.body}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    rows={3}
                    aria-invalid={!!(touched.body && errors.body)}
                  />
                  {touched.body && errors.body && (
                    <p className="text-xs text-destructive">{errors.body}</p>
                  )}
                </div>

                {/* Target Segment */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-target">{t('form.segment')} *</Label>
                  <Select
                    value={values.target}
                    onValueChange={(val) => setFieldValue('target', val)}
                  >
                    <SelectTrigger id="notif-target" className="w-full">
                      <SelectValue placeholder={t('form.segmentPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {t(`segments.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.target && errors.target && (
                    <p className="text-xs text-destructive">{errors.target}</p>
                  )}
                </div>

                {/* Image URL (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-image">{t('form.imageUrl')}</Label>
                  <Input
                    id="notif-image"
                    name="image"
                    placeholder={t('form.imageUrlPlaceholder')}
                    value={values.image}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.image && errors.image)}
                  />
                  <p className="text-xs text-muted-foreground">{t('form.imageUrlHint')}</p>
                  {touched.image && errors.image && (
                    <p className="text-xs text-destructive">{errors.image}</p>
                  )}
                </div>

                {/* Deep Link URL (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-deeplink">{t('form.deepLink')}</Label>
                  <Input
                    id="notif-deeplink"
                    name="deepLinkUrl"
                    placeholder={t('form.deepLinkPlaceholder')}
                    value={values.deepLinkUrl}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <p className="text-xs text-muted-foreground">{t('form.deepLinkHint')}</p>
                </div>

                {/* Below Version (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="notif-version">{t('form.belowVersion')}</Label>
                  <Input
                    id="notif-version"
                    name="belowVersion"
                    placeholder={t('form.belowVersionPlaceholder')}
                    value={values.belowVersion}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <p className="text-xs text-muted-foreground">{t('form.belowVersionHint')}</p>
                </div>

                <AppButton
                  type="submit"
                  isLoading={isPending}
                  className="w-full"
                  leftIcon={<Send size={16} />}
                >
                  {t('send')}
                </AppButton>
              </Form>
            )}
          </Formik>
        )}

        {lastResult && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 mt-4">
            <p className="text-sm text-green-800 dark:text-green-400">
              {t('lastBroadcast', { count: lastResult.sent, segment: lastResult.segment })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
