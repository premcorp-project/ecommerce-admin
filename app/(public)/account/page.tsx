/**
 * Account Dashboard Page — app/(public)/account/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 9.1, 9.2, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { AccountDashboardContent } from './AccountDashboardContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'My Account | OttimoDirect',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountDashboardPage() {
  return <AccountDashboardContent />;
}
