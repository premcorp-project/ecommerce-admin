/**
 * Profile Page — app/(public)/account/profile/page.tsx
 *
 * Server Component wrapper. Exports metadata and renders the client content.
 *
 * Requirements: 9.1, 9.3, 9.4, 9.10, 14.8
 */

import type { Metadata } from 'next';
import { ProfilePageContent } from './ProfilePageContent';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Profile | ChemTech',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return <ProfilePageContent />;
}
