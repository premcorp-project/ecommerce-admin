/**
 * Support Ticket Detail Page — app/(public)/account/support/[ticketId]/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 * Passes params Promise directly to the content component which calls use(params).
 *
 * Requirements: 9.1, 9.8, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { SupportTicketDetailPageContent } from './SupportTicketDetailPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Support Ticket | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ ticketId: string }>;
}

export default function SupportTicketDetailPage({ params }: PageProps) {
  return <SupportTicketDetailPageContent params={params} />;
}
