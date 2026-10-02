/**
 * Privacy Policy Page — renders privacyPolicy HTML from platform config.
 */

import type { Metadata } from 'next';
import axios from 'axios';
import { RichContent } from '@/components/shared/text-editor/RichContent';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export const metadata: Metadata = {
  title: 'Privacy Policy | OttimoDirect',
  description: 'Read our privacy policy to understand how we handle your data.',
};

export const revalidate = 300;

async function getConfig() {
  try {
    const res = await axios.get(`${API_BASE}/config`);
    return res.data?.data?.config ?? res.data?.config ?? null;
  } catch {
    return null;
  }
}

export default async function PrivacyPage() {
  const config = await getConfig();
  const content = config?.privacyPolicy;

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        Privacy Policy
      </h1>
      {content ? (
        <RichContent
          html={content}
          className="prose prose-sm max-w-none text-foreground"
        />
      ) : (
        <p className="text-muted-foreground">
          Privacy policy will be available soon.
        </p>
      )}
    </main>
  );
}
