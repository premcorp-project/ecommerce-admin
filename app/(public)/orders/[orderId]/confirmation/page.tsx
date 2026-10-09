/**
 * Order Confirmation Page — app/(public)/orders/[orderId]/confirmation/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 * Passes params Promise directly to the content component which calls use(params).
 *
 * Requirements: 8.7
 */

import type { Metadata } from 'next';
import { OrderConfirmationPageContent } from './OrderConfirmationPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Order Confirmed | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderConfirmationPage({ params }: PageProps) {
  return <OrderConfirmationPageContent params={params} />;
}
