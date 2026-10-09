/**
 * About Us Page — renders aboutUs HTML from platform config.
 */

import type { Metadata } from 'next';
import axios from 'axios';
import { RichContent } from '@/components/shared/text-editor/RichContent';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export const metadata: Metadata = {
  title: 'About Us | ChemTech',
  description:
    'Learn about ChemTech — your trusted supplier of industrial chemical products.',
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

export default async function AboutPage() {
  const config = await getConfig();
  const content = config?.aboutUs;

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <h1 className="text-3xl font-bold text-foreground mb-8">About Us</h1>
      {content ? (
        <RichContent
          html={content}
          className="prose prose-sm max-w-none text-foreground"
        />
      ) : (
        <p className="text-muted-foreground">
          About us content will be available soon.
        </p>
      )}
    </main>
  );
}
