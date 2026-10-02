/**
 * ProductCarouselSkeleton — horizontal skeleton matching the live product carousel layout.
 *
 * Renders a row of ProductSkeleton cards inside a horizontally-overflowing strip with
 * the same `basis-*` widths as the real carousel, so loading→loaded transitions don't
 * cause layout pop.
 */

import { ProductSkeleton } from './ProductSkeleton';

export function ProductCarouselSkeleton() {
    return (
        <div
            className="flex gap-3 md:gap-4 overflow-hidden"
            aria-hidden="true"
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 shrink-0"
                >
                    <ProductSkeleton />
                </div>
            ))}
        </div>
    );
}

export default ProductCarouselSkeleton;
