/**
 * Guest Order Lookup Page — app/(public)/order-lookup/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { Metadata } from 'next';
import { OrderLookupPageContent } from './OrderLookupPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Track Your Order | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderLookupPage() {
  return <OrderLookupPageContent />;
}
