/**
 * Support Page — app/(public)/account/support/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 9.1, 9.7, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { SupportPageContent } from './SupportPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Support | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return <SupportPageContent />;
}
