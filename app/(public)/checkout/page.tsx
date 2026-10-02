/**
 * Checkout Page — app/(public)/checkout/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 * Checkout is client-side only — no SSR/ISR.
 *
 * Requirements: 7.1, 7.10, 7.11, 7.12
 */

import type { Metadata } from 'next';
import { CheckoutPageContent } from './CheckoutPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Checkout | OttimoDirect',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
