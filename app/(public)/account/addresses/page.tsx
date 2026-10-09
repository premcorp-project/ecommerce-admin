/**
 * Addresses Page — app/(public)/account/addresses/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 9.1, 9.5, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { AddressesPageContent } from './AddressesPageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Addresses | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  return <AddressesPageContent />;
}
