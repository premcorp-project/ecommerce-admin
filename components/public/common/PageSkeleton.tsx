import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
}

/**
 * PageSkeleton — full-page skeleton for product detail pages.
 *
 * Layout:
 *   - Stacks vertically on mobile (flex-col)
 *   - Side-by-side on desktop (lg:flex-row)
 *   - Left column: image block + thumbnail strip
 *   - Right column: breadcrumb, title, rating, price, variant buttons, CTA
 *
 * Uses shadcn Skeleton component.
 *
 * Requirements: 13.9
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div
      className={cn('flex flex-col gap-8 lg:flex-row lg:gap-12', className)}
      aria-hidden="true"
    >
      {/* Left column — image gallery */}
      <div className="flex flex-col gap-3 w-full lg:w-1/2 lg:max-w-lg">
        {/* Main image */}
        <Skeleton className="w-full aspect-square rounded-lg" />

        {/* Thumbnail strip */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-16 rounded-md flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Right column — product info */}
      <div className="flex flex-col gap-5 w-full lg:flex-1">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48" />

        {/* Product title */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-3/4" />
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Price */}
        <Skeleton className="h-8 w-32" />

        {/* Variant selector label + buttons */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-md" />
            ))}
          </div>
        </div>

        {/* Quantity + Add to Cart */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>

        {/* Description lines */}
        <div className="flex flex-col gap-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}
