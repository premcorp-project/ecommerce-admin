import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductSkeletonProps {
    className?: string;
}

/**
 * ProductSkeleton — matches the live ProductCard layout exactly so there is no
 * layout pop on data arrival.
 *
 * Mirrors:
 *   - aspect-square image (with wishlist heart placeholder top-right)
 *   - rounded-xl card, p-4 body
 *   - category mini-label, name (2 lines), rating row, price block
 */
export function ProductSkeleton({ className }: ProductSkeletonProps) {
    return (
        <div
            className={cn(
                'relative flex flex-col rounded-xl border border-border bg-card overflow-hidden h-full',
                className,
            )}
            aria-hidden="true"
        >
            {/* Wishlist placeholder — same position as the real card */}
            <Skeleton className="absolute top-3 right-3 z-10 size-9 rounded-full" />

            {/* Image area — aspect-square to match the card */}
            <Skeleton className="w-full aspect-square rounded-none" />

            {/* Body — same paddings + gaps as the real card */}
            <div className="flex flex-col gap-2 p-4 flex-1">
                {/* Category mini-label */}
                <Skeleton className="h-3 w-16" />

                {/* Product name — two lines */}
                <div className="flex flex-col gap-1.5 min-h-[2.5rem]">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Rating row */}
                <Skeleton className="h-3.5 w-24" />

                {/* Price */}
                <div className="mt-auto pt-1">
                    <Skeleton className="h-6 w-1/3" />
                </div>
            </div>
        </div>
    );
}

export default ProductSkeleton;
