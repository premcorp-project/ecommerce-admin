'use client';

/**
 * Admin Settings Page — /admin/settings
 *
 * Tabbed layout organizing all platform configuration:
 *   - General: tax, currency, toggles, pickup
 *   - Business: name, contact, address, hours, social links
 *   - Delivery: rates + fallback fee
 *   - Legal: terms, privacy, returns (collapsible accordions)
 *   - Appearance: theme picker
 */
import { Building2, FileText, Settings, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BusinessDetailsForm from '@/components/admin/settings/BusinessDetailsForm';
import DeliveryZoneList from '@/components/admin/settings/DeliveryZoneList';
import LegalPagesForm from '@/components/admin/settings/LegalPagesForm';
import PlatformConfigForm from '@/components/admin/settings/PlatformConfigForm';

export default function SettingsPage() {
  const t = useTranslations('admin.settings');
  const hasWriteAccess = useAdminAuthStore((state) => state.hasWriteAccess);
  const canWrite = hasWriteAccess('config');

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto flex-wrap gap-0">
          <TabsTrigger
            value="general"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
          >
            <Settings className="size-4 mr-2" />
            {t('tabs.general')}
          </TabsTrigger>
          <TabsTrigger
            value="business"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
          >
            <Building2 className="size-4 mr-2" />
            {t('tabs.business')}
          </TabsTrigger>
          <TabsTrigger
            value="delivery"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
          >
            <Truck className="size-4 mr-2" />
            {t('tabs.delivery')}
          </TabsTrigger>
          <TabsTrigger
            value="legal"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium"
          >
            <FileText className="size-4 mr-2" />
            {t('tabs.legal')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <PlatformConfigForm canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="business" className="mt-6">
          <BusinessDetailsForm canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <DeliveryZoneList canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <LegalPagesForm canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
