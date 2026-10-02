/**
 * Product Listing Page — app/(public)/products/page.tsx
 *
 * SSR: URL-driven filters must be server-rendered for SEO.
 * Reads all filter params from searchParams, fetches GET /catalog/products,
 * and passes data down to section components.
 *
 * Layout:
 *   - Desktop (md+): filters sidebar on left (w-64), product grid + sort on right
 *   - Mobile (<md): sort + filter trigger on top, product grid below
 *
 * Requirements: 4.1, 4.2, 4.10
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type {
  AvailableFilters,
  Pagination,
  Product,
  ProductListResponse,
} from '@/types/public';
import publicApi from '@/lib/api/public-api';
import { SortSelector } from '@/components/public/products/SortSelector';
import ProductFiltersSection from '@/components/public/sections/product-filters';
import ProductGridSection from '@/components/public/sections/product-grid';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParamsInput = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams: Promise<SearchParamsInput>;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

/**
 * Builds the API params object from URL search params.
 * Never sends includeAll=false (Requirement 4.10).
 */
function buildApiParams(
  sp: SearchParamsInput,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  if (sp.page) params.page = Number(sp.page);
  if (sp.limit) params.limit = Number(sp.limit);
  if (sp.category) params.category = sp.category as string;
  if (sp.search) params.search = sp.search as string;
  if (sp.sortBy) params.sortBy = sp.sortBy as string;
  if (sp.minPrice) params.minPrice = Number(sp.minPrice);
  if (sp.maxPrice) params.maxPrice = Number(sp.maxPrice);
  if (sp.inStock === 'true') params.inStock = true;
  if (sp.featured === 'true') params.featured = true;
  if (sp.tags) params.tags = sp.tags as string;

  // Pass attribute filters through — e.g. attributes[Color]=Red,Blue
  Object.entries(sp).forEach(([key, value]) => {
    if (key.startsWith('attributes[') && value) {
      params[key] = value as string;
    }
  });

  // NEVER send includeAll=false (Requirement 4.10)
  // Simply omit the param entirely for storefront requests.

  return params;
}

async function fetchProducts(
  sp: SearchParamsInput,
): Promise<ProductListResponse> {
  const params = buildApiParams(sp);
  try {
    const res = await publicApi.get('/catalog/products', { params });
    const result = res.data.data as ProductListResponse;
    // Normalise id → _id in case the API returns 'id' instead of '_id'
    if (Array.isArray(result?.products)) {
      result.products = result.products.map((p: any) => ({
        ...p,
        _id: p._id ?? p.id ?? '',
      }));
    }
    return result;
  } catch {
    // Return empty state on error — page renders gracefully
    return {
      products: [],
      pagination: {
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        perPage: 20,
        hasNextPage: false,
        hasPrevPage: false,
      },
      availableFilters: {
        attributes: [],
        priceRange: { min: 0, max: 1000 },
      },
    };
  }
}

/**
 * Fetches a single category by slug to get its name for metadata.
 * Returns null if not found or on error.
 */
async function fetchCategoryName(slug: string): Promise<string | null> {
  try {
    const res = await publicApi.get('/catalog/categories');
    const categories: { _id: string; name: string; slug: string }[] =
      res.data?.data ?? res.data ?? [];
    const flat = flattenCategories(categories);
    const match = flat.find((c) => c.slug === slug || c._id === slug);
    return match?.name ?? null;
  } catch {
    return null;
  }
}

function flattenCategories(
  cats: { _id: string; name: string; slug: string; children?: unknown[] }[],
): { _id: string; name: string; slug: string }[] {
  const result: { _id: string; name: string; slug: string }[] = [];
  for (const cat of cats) {
    result.push({ _id: cat._id, name: cat.name, slug: cat.slug });
    if (Array.isArray(cat.children) && cat.children.length > 0) {
      result.push(
        ...flattenCategories(
          cat.children as {
            _id: string;
            name: string;
            slug: string;
            children?: unknown[];
          }[],
        ),
      );
    }
  }
  return result;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const t = await getTranslations('public.products');

  let title = t('defaultTitle');

  if (sp.search) {
    title = t('searchResults', { query: sp.search as string });
  } else if (sp.category) {
    const categoryName = await fetchCategoryName(sp.category as string);
    if (categoryName) {
      title = t('categoryResults', { category: categoryName });
    }
  }

  return {
    title: `${title} | OttimoDirect`,
    description:
      'Browse professional-grade adhesives, resins, coatings, and solvents. Filter by category, price, and attributes.',
    openGraph: {
      title: `${title} | OttimoDirect`,
      description:
        'Browse professional-grade adhesives, resins, coatings, and solvents. Filter by category, price, and attributes.',
      type: 'website',
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductsPage({ searchParams }: PageProps) {
  // In Next.js 15, searchParams is a Promise — must be awaited
  const sp = await searchParams;

  const data = await fetchProducts(sp);

  const products: Product[] = data.products ?? [];
  const pagination: Pagination = data.pagination;
  const availableFilters: AvailableFilters = data.availableFilters ?? {
    attributes: [],
    priceRange: { min: 0, max: 1000 },
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* ── Mobile: sort + filter trigger row ── */}
      <div className="flex items-center justify-between gap-3 mb-6 md:hidden">
        {/*
         * ProductFiltersSection uses useSearchParams internally (client component).
         * Suspense boundary prevents CSR bailout on the SSR page.
         */}
        <Suspense fallback={null}>
          <ProductFiltersSection availableFilters={availableFilters} />
        </Suspense>
        <Suspense fallback={null}>
          <SortSelector className="flex-1" />
        </Suspense>
      </div>

      {/* ── Layout: sidebar + main content ── */}
      <div className="flex gap-8 items-start">
        {/* Desktop sidebar — hidden on mobile (ProductFiltersSection handles that) */}
        <div className="hidden md:block">
          <Suspense fallback={null}>
            <ProductFiltersSection availableFilters={availableFilters} />
          </Suspense>
        </div>

        {/* Main content: sort bar + product grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Desktop sort bar */}
          <div className="hidden md:flex items-center justify-end">
            <Suspense fallback={null}>
              <SortSelector />
            </Suspense>
          </div>

          {/* Product grid with pagination */}
          <Suspense fallback={null}>
            <ProductGridSection
              products={products}
              isLoading={false}
              pagination={pagination}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
