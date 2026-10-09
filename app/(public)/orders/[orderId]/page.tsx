/**
 * Order Detail Page — app/(public)/orders/[orderId]/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 * Passes params Promise directly to the content component which calls use(params).
 *
 * Requirements: 8.3
 */

import type { Metadata } from 'next';
import { OrderDetailPageContent } from './OrderDetailPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Order Details | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  return <OrderDetailPageContent params={params} />;
}
