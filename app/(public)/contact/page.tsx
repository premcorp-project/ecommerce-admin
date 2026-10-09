/**
 * Contact Us Page — app/(public)/contact/page.tsx
 *
 * Static page with contact form, company info, and map placeholder.
 * No auth required. Form submits to POST /support/contact (or shows toast for now).
 *
 * Requirements: SEO metadata, localized strings, semantic tokens only.
 */

import type { Metadata } from 'next';
import { ContactPageContent } from './ContactPageContent';

export const metadata: Metadata = {
  title: 'Contact Us | ChemTech',
  description:
    'Get in touch with ChemTech for bulk orders, technical support, or general enquiries. We respond within 24 hours.',
};

export default function ContactPage() {
  return (
    <main>
      <ContactPageContent />
    </main>
  );
}
