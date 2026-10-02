/**
 * Homepage — app/(public)/page.tsx
 *
 * ISR with revalidate: 60 — fresh banners and featured products every minute.
 * Thin composer: each section owns its own data fetching via usePublicQuery.
 *
 * Section order (UX priority: findability → trust → discovery → conversion):
 *   Hero → Trust → Categories → Featured → Collections (tags) →
 *   New Arrivals → Why OttimoDirect → Promo banners → Best Sellers →
 *   Bulk CTA → Recently Viewed → Testimonials → Newsletter
 */

import type { Metadata } from 'next';
import BestSellersSection from '@/components/public/sections/best-sellers';
import BulkCtaSection from '@/components/public/sections/bulk-cta';
import CategoryGridSection from '@/components/public/sections/category-grid';
import FeaturedProductsSection from '@/components/public/sections/featured-products';
import HeroSection from '@/components/public/sections/hero';
import NewArrivalsSection from '@/components/public/sections/new-arrivals';
import NewsletterStripSection from '@/components/public/sections/newsletter-strip';
import PromoBannersSection from '@/components/public/sections/promo-banners';
import RecentlyViewedSection from '@/components/public/sections/recently-viewed';
import TagGridSection from '@/components/public/sections/tag-grid';
import TestimonialsSection from '@/components/public/sections/testimonials';
import TrustBadgesSection from '@/components/public/sections/trust-badges';
import WhyChemibuildSection from '@/components/public/sections/why-chemibuild';

// ─── ISR ──────────────────────────────────────────────────────────────────────

export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'OttimoDirect — Industrial Chemical Products',
    description:
      'Professional-grade adhesives, resins, coatings, and solvents for industrial and commercial applications. Bulk pricing available.',
    openGraph: {
      title: 'OttimoDirect — Industrial Chemical Products',
      description:
        'Professional-grade adhesives, resins, coatings, and solvents for industrial and commercial applications.',
      type: 'website',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TrustBadgesSection />
      <CategoryGridSection />
      <FeaturedProductsSection />
      <TagGridSection />
      <NewArrivalsSection />
      <WhyChemibuildSection />
      <PromoBannersSection />
      <BestSellersSection />
      <BulkCtaSection />
      <RecentlyViewedSection />
      <TestimonialsSection />
      <NewsletterStripSection />
    </main>
  );
}
