/**
 * Wishlist Page — app/(public)/account/wishlist/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 9.1, 9.6, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { WishlistPageContent } from './WishlistPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Wishlist | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  return <WishlistPageContent />;
}
