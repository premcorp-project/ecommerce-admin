/**
 * Newsletter Unsubscribe Page — handles unsubscribe link from emails.
 * Reads ?email= from URL and calls POST /config/newsletter/unsubscribe.
 */

import type { Metadata } from 'next';
import { UnsubscribeContent } from './UnsubscribeContent';

export const metadata: Metadata = {
  title: 'Unsubscribe | OttimoDirect',
  description: 'Unsubscribe from OttimoDirect newsletter.',
};

export default function UnsubscribePage() {
  return (
    <main className="container mx-auto px-4 py-16 text-center">
      <UnsubscribeContent />
    </main>
  );
}
