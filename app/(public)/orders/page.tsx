/**
 * Orders List Page — app/(public)/orders/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 8.1
 */

import type { Metadata } from 'next';
import { OrdersPageContent } from './OrdersPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'My Orders | OttimoDirect',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  return <OrdersPageContent />;
}
