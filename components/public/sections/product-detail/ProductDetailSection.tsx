'use client';
// ProductDetailSection — thin orchestrator. Requirements: 5.1, 5.13

import { CurrencyDisplay } from '@/components/public/common/CurrencyDisplay';
import { addToRecentlyViewed } from '@/components/public/sections/recently-viewed';
import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import type { Variant } from '@/types/public';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AddToCartSection } from './AddToCartSection';
import { BulkPricingTable } from './BulkPricingTable';
import { ProductDetailTabs } from './ProductDetailTabs';
import { ProductImages } from './ProductImages';
import { ProductInfo } from './ProductInfo';
import { RelatedProducts } from './RelatedProducts';
import type { ProductDetailSectionProps } from './types';
import { VariantSelector } from './VariantSelector';

export function ProductDetailSection({ product }: ProductDetailSectionProps) {
  const t = useTranslations('public.product');
  const hasBulkAccess = useCustomerAuthStore((s) => s.user?.hasBulkAccess ?? false);

  // Save to recently viewed on mount
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    addToRecentlyViewed(product);
  }, [product]);

  // Auto-select the lowest-priced available variant so pricing shows immediately
  const defaultVariant = (() => {
    const available = (product.variants ?? []).filter((v) => v.available);
    if (available.length === 0) return null;
    return available.reduce((lowest, v) => v.effectivePrice < lowest.effectivePrice ? v : lowest, available[0]);
  })();

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(defaultVariant);
  // Quantity is lifted here so PriceDisplay can apply bulk pricing correctly
  const [quantity, setQuantity] = useState(1);

  // Use selected variant for tiers, or fall back to first available variant for preview
  const tiersVariant = selectedVariant ?? defaultVariant;

  return (
    <section aria-label={t('productDetails')} className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Top section: Image + Key Info side by side */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        {/* Image gallery — 40% on desktop */}
        <div className="w-full lg:w-[50%] shrink-0">
          <div className="sticky top-24">
            <ProductImages images={product.images ?? []} selectedVariantImageUrl={selectedVariant?.imageUrl ?? null} />
          </div>
        </div>

        {/* Product info — 60% on desktop */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <ProductInfo product={product} selectedVariant={selectedVariant} />
          <VariantSelector product={product} onVariantChange={setSelectedVariant} selectedVariant={defaultVariant} />

          {/* Price */}
          {(selectedVariant || tiersVariant) && (() => {
            const v = selectedVariant ?? tiersVariant!;
            return (
              <div className="flex items-baseline gap-2">
                <CurrencyDisplay
                  amount={v.effectivePrice}
                  className="text-2xl font-bold text-foreground"
                />
                {v.discountedPrice !== null && v.discountedPrice < v.price && (
                  <CurrencyDisplay
                    amount={v.price}
                    className="text-base text-muted-foreground line-through"
                  />
                )}
              </div>
            );
          })()}

          {/* Tier pricing table */}
          {selectedVariant && (
            <BulkPricingTable
              bulkPricingTiers={selectedVariant.bulkPricingTiers}
              retailDiscountTiers={selectedVariant.retailDiscountTiers}
              effectivePrice={selectedVariant.effectivePrice}
              quantity={quantity}
            />
          )}
          {!selectedVariant && tiersVariant && (
            <BulkPricingTable
              bulkPricingTiers={tiersVariant.bulkPricingTiers}
              retailDiscountTiers={tiersVariant.retailDiscountTiers}
              effectivePrice={tiersVariant.effectivePrice}
              quantity={1}
            />
          )}

          {/* Add to cart */}
          <AddToCartSection
            productId={product._id}
            productName={product.name}
            productSlug={product.slug}
            productImage={(product.images ?? [])[0]?.url ?? null}
            selectedVariant={selectedVariant}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
        </div>
      </div>

      {/* Below fold: Tabbed Description + Reviews */}
      <div className="mt-12" id="reviews">
        <ProductDetailTabs
          description={product.description}
          productId={product._id}
          frequentlyBoughtTogether={product.frequentlyBoughtTogether}
        />
      </div>

      {/* You Might Also Like — products from same category */}
      <RelatedProducts
        categorySlug={product.category?.slug}
        excludeProductId={product._id}
      />
    </section>
  );
}

export default ProductDetailSection;
