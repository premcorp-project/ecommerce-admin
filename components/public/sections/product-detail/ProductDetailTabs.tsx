'use client';

import { RichContent } from '@/components/shared/text-editor/RichContent';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FrequentlyBought } from './FrequentlyBought';
import { ReviewSection } from './ReviewSection';

interface ProductDetailTabsProps {
  description: string;
  productId: string;
  frequentlyBoughtTogether: string[];
}

type Tab = 'description' | 'reviews';

export function ProductDetailTabs({
  description,
  productId,
  frequentlyBoughtTogether,
}: ProductDetailTabsProps) {
  const t = useTranslations('public.product');
  const [activeTab, setActiveTab] = useState<Tab>('description');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: t('description') },
    { id: 'reviews', label: t('reviews') },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-8" aria-label="Product information tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'description' && (
          <div className="max-w-3xl">
            {description ? (
              <RichContent
                html={description}
                className="text-sm text-foreground/90 leading-relaxed"
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t('noDescription')}</p>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewSection productId={productId} />
        )}
      </div>

      {/* Frequently bought together — always visible below tabs */}
      <FrequentlyBought frequentlyBoughtTogether={frequentlyBoughtTogether} />
    </div>
  );
}
