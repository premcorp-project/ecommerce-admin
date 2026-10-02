'use client';

/**
 * LegalPagesForm — rich text editors for Terms, Privacy, and Return policies.
 *
 * Uses shadcn Accordion to collapse each editor — saves vertical space.
 * Fetches from GET /config and saves via PUT /config.
 */

import { AppButton } from '@/components/shared/AppButton';
import AppRichEditor from '@/components/shared/text-editor/AppRichEditor';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useAdminMutation, useAdminQuery } from '@/lib/api/admin-hooks';
import { adminQueryKeys } from '@/lib/api/admin-query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Formik, FormikHelpers } from 'formik';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LegalFormValues {
    aboutUs: string;
    termsAndConditions: string;
    privacyPolicy: string;
    returnPolicy: string;
}

interface LegalPagesFormProps {
    canWrite: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LegalPagesForm({ canWrite }: LegalPagesFormProps) {
    const t = useTranslations('admin.settings');
    const queryClient = useQueryClient();

    const { data: configData, isLoading } = useAdminQuery<any>(
        adminQueryKeys.settings(),
        '/config',
    );

    const { mutateAsync: updateConfig, isPending } = useAdminMutation<
        { success: boolean },
        Record<string, unknown>
    >('put', '/config');

    const cfg = (configData as any)?.data?.config ?? configData?.config;

    const initialValues: LegalFormValues = {
        aboutUs: cfg?.aboutUs ?? '',
        termsAndConditions: cfg?.termsAndConditions ?? '',
        privacyPolicy: cfg?.privacyPolicy ?? '',
        returnPolicy: cfg?.returnPolicy ?? '',
    };

    const handleSubmit = async (
        values: LegalFormValues,
        _helpers: FormikHelpers<LegalFormValues>,
    ) => {
        try {
            await updateConfig({
                aboutUs: values.aboutUs,
                termsAndConditions: values.termsAndConditions,
                privacyPolicy: values.privacyPolicy,
                returnPolicy: values.returnPolicy,
            });
            toast.success(t('toast.configUpdated'));
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err?.response?.data?.message || t('toast.configUpdateFailed'));
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-12 rounded bg-muted" />
                <div className="h-12 rounded bg-muted" />
                <div className="h-12 rounded bg-muted" />
            </div>
        );
    }

    return (
        <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
            {({ values, setFieldValue }) => (
                <Form className="space-y-4">
                    <Accordion type="multiple" className="space-y-3">
                        {/* About Us */}
                        <AccordionItem value="about" className="rounded-lg border bg-card px-4">
                            <AccordionTrigger className="py-4 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <FileText className="size-4 text-primary" />
                                    <span className="text-sm font-semibold">{t('form.aboutUs')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                <AppRichEditor
                                    value={values.aboutUs}
                                    onChange={(html) => setFieldValue('aboutUs', html)}
                                    placeholder={t('form.aboutUsPlaceholder')}
                                    disabled={!canWrite}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Terms & Conditions */}
                        <AccordionItem value="terms" className="rounded-lg border bg-card px-4">
                            <AccordionTrigger className="py-4 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <FileText className="size-4 text-primary" />
                                    <span className="text-sm font-semibold">{t('form.termsAndConditions')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                <AppRichEditor
                                    value={values.termsAndConditions}
                                    onChange={(html) => setFieldValue('termsAndConditions', html)}
                                    placeholder={t('form.termsPlaceholder')}
                                    disabled={!canWrite}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Privacy Policy */}
                        <AccordionItem value="privacy" className="rounded-lg border bg-card px-4">
                            <AccordionTrigger className="py-4 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <FileText className="size-4 text-primary" />
                                    <span className="text-sm font-semibold">{t('form.privacyPolicy')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                <AppRichEditor
                                    value={values.privacyPolicy}
                                    onChange={(html) => setFieldValue('privacyPolicy', html)}
                                    placeholder={t('form.privacyPlaceholder')}
                                    disabled={!canWrite}
                                />
                            </AccordionContent>
                        </AccordionItem>

                        {/* Return Policy */}
                        <AccordionItem value="returns" className="rounded-lg border bg-card px-4">
                            <AccordionTrigger className="py-4 hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <FileText className="size-4 text-primary" />
                                    <span className="text-sm font-semibold">{t('form.returnPolicy')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                <AppRichEditor
                                    value={values.returnPolicy}
                                    onChange={(html) => setFieldValue('returnPolicy', html)}
                                    placeholder={t('form.returnPlaceholder')}
                                    disabled={!canWrite}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* Submit */}
                    {canWrite && (
                        <div className="pt-2">
                            <AppButton type="submit" isLoading={isPending}>
                                {t('form.saveSettings')}
                            </AppButton>
                        </div>
                    )}
                </Form>
            )}
        </Formik>
    );
}
