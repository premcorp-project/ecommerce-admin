/**
 * Product Detail Page — app/(public)/products/[slug]/page.tsx
 *
 * ISR with revalidate: 300 — product data changes infrequently.
 * Server-side fetch via publicApi (Axios) using the slug.
 * Calls notFound() on 404 to render the Next.js 404 page.
 * Exports generateMetadata with product name as title and stripped HTML description.
 * Includes JSON-LD Product structured data script.
 *
 * Requirements: 5.1
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import axios from 'axios';
import type { Product } from '@/types/public';
import ProductDetailSection from '@/components/public/sections/product-detail';

// ─── ISR ──────────────────────────────────────────────────────────────────────

export const revalidate = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>;
};

// ─── Server-side fetch ────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

/**
 * Fetch a single product by slug from the public catalog API.
 * Returns null on 404 so the page can call notFound().
 * Throws on other errors so Next.js error boundaries can handle them.
 */
async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await axios.get(`${API_BASE}/catalog/products/${slug}`);
    // Handle both { success, data: Product } and { success, data: { product: Product } }
    const raw = res.data?.data;
    const product = raw?.product ?? raw ?? null;
    // Normalise id → _id
    if (product && !product._id && product.id) {
      product._id = product.id;
    }
    return product as Product | null;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product Not Found | ChemTech',
    };
  }

  // Strip HTML tags from description and truncate to 160 chars for meta
  const strippedDescription = (product.description ?? '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 160);

  return {
    title: `${product.name} | ChemTech`,
    description: strippedDescription,
    openGraph: {
      title: `${product.name} | ChemTech`,
      description: strippedDescription,
      images:
        (product.images ?? []).length > 0
          ? [(product.images ?? [])[0].url]
          : [],
      type: 'website',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Strip HTML for JSON-LD description
  const strippedDescription = (product.description ?? '').replace(
    /<[^>]+>/g,
    '',
  );

  // JSON-LD Product structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: strippedDescription,
    image: (product.images ?? []).map((img) => img.url),
    brand: {
      '@type': 'Brand',
      name: 'ChemTech',
    },
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
      },
    }),
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: product.minPrice,
      priceCurrency: 'USD',
      availability: product.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      {/* JSON-LD structured data for SEO — plain script tag in Server Component */}
      <script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Product detail section — thin composer */}
      <main>
        <ProductDetailSection product={product} />
      </main>
    </>
  );
}
