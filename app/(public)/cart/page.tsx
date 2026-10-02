/**
 * Cart Page — app/(public)/cart/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 * Cart is client-side only — no SSR/ISR.
 *
 * Requirements: 6.1, 6.6, 6.9, 6.10, 6.11
 */

import type { Metadata } from 'next';
import { CartPageContent } from './CartPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Cart | OttimoDirect',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CartPage() {
  return <CartPageContent />;
}
