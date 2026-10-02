/**
 * Public layout — wraps all customer-facing pages.
 *
 * Server Component — no 'use client' directive.
 * Composes: Navbar → Breadcrumb → {children} → Footer
 *
 * Requirements: 2.1, 2.9
 */

import type { Metadata } from 'next';
import { ChatwootWidget } from '@/components/public/common/ChatwootWidget';
import { WhatsAppButton } from '@/components/public/common/WhatsAppButton';
import { WishlistInitializer } from '@/components/public/common/WishlistInitializer';
import { AdminRedirect } from '@/components/public/layout/AdminRedirect';
import { Breadcrumb } from '@/components/public/layout/Breadcrumb';
import { Footer } from '@/components/public/layout/Footer';
import { Navbar } from '@/components/public/layout/Navbar';
import { PopupBanner } from '@/components/public/layout/PopupBanner';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
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

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navigation */}
      <Navbar />

      {/* Breadcrumb — shown below navbar, above content */}
      <div className="container mx-auto px-4 sm:px-6 py-2">
        <Breadcrumb />
      </div>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <Footer />

      {/* Redirect admin/staff users to the admin dashboard */}
      <AdminRedirect />

      {/* Popup banner — shows after configured delay */}
      <PopupBanner />

      {/* WhatsApp floating button */}
      <WhatsAppButton />

      {/* Wishlist IDs fetcher */}
      <WishlistInitializer />

      {/* Chatwoot live chat widget */}
      <ChatwootWidget />
    </div>
  );
}
