'use client';

/**
 * ProductImages — product image gallery with main image + thumbnail strip.
 *
 * - Renders the first product image as the main image by default
 * - When a variant with `imageUrl` is selected, shows that as the main image
 * - Clicking a thumbnail sets it as the active main image
 * - Uses next/image with fill + explicit sizes for responsive layout
 * - `priority` is set on the main image only (LCP candidate)
 * - Aspect ratio: consistent 4:3 for main image
 * - Stacks full-width on mobile; side-by-side layout handled by parent
 *
 * Requirements: 5.2, 5.13
 */

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductImage {
    url: string;
    publicId: string;
}

export interface ProductImagesProps {
    /** Product images array from the product detail response */
    images: ProductImage[];
    /**
     * When a variant with an imageUrl is selected, this URL is shown as the main image.
     * When null, the user-selected thumbnail (or first image) is shown.
     */
    selectedVariantImageUrl: string | null;
}

// ─── Fallback placeholder ─────────────────────────────────────────────────────

function ImagePlaceholder({ label }: { label: string }) {
    return (
        <div
            className="w-full h-full flex items-center justify-center bg-muted"
            aria-label={label}
        >
            <svg
                className="size-16 text-muted-foreground/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductImages({ images, selectedVariantImageUrl }: ProductImagesProps) {
    const t = useTranslations('public.product');

    // Index of the thumbnail the user has manually selected
    const [selectedIndex, setSelectedIndex] = useState(0);
    // Track if user manually clicked a thumbnail (overrides variant image)
    const [userOverride, setUserOverride] = useState(false);

    // Reset override when variant image changes (user selected a different variant)
    useEffect(() => {
        setUserOverride(false);
    }, [selectedVariantImageUrl]);

    // Variant image takes precedence unless user manually clicked a thumbnail
    const mainImageSrc: string | null =
        (!userOverride && selectedVariantImageUrl) ? selectedVariantImageUrl : images[selectedIndex]?.url ?? null;

    const showThumbnails = images.length > 1;

    const handleThumbnailClick = (index: number) => {
        setSelectedIndex(index);
        setUserOverride(true);
    };

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Close lightbox on Escape
    useEffect(() => {
        if (!lightboxOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % images.length);
            if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + images.length) % images.length);
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [lightboxOpen, images.length]);

    const openLightbox = useCallback(() => {
        const currentIdx = images.findIndex((img) => img.url === mainImageSrc);
        setLightboxIndex(currentIdx >= 0 ? currentIdx : 0);
        setLightboxOpen(true);
    }, [images, mainImageSrc]);

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* ── Main image ── */}
            <button
                type="button"
                onClick={openLightbox}
                className="relative w-full overflow-hidden rounded-lg bg-muted group cursor-zoom-in"
                style={{ aspectRatio: '4 / 3' }}
                aria-label={t('mainImage')}
            >
                {mainImageSrc ? (
                    <>
                        <Image
                            src={mainImageSrc}
                            alt={t('mainImage')}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                            className="object-contain transition-opacity duration-200"
                            priority
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-200">
                            <ZoomIn className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
                        </div>
                    </>
                ) : (
                    <ImagePlaceholder label={t('mainImage')} />
                )}
            </button>

            {/* ── Thumbnail strip — only shown when there are multiple images ── */}
            {showThumbnails && (
                <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    role="listbox"
                    aria-label={t('images')}
                >
                    {images.map((image, index) => {
                        // A thumbnail is "active" when no variant image is overriding
                        // and this thumbnail is the one the user selected
                        const isActive =
                            (userOverride || selectedVariantImageUrl === null) && index === selectedIndex;

                        return (
                            <button
                                key={image.publicId}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                aria-label={t('thumbnailAlt', { index: index + 1 })}
                                onClick={() => handleThumbnailClick(index)}
                                className={cn(
                                    'relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition-all duration-150',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                                    'min-h-[44px] min-w-[44px]',
                                    isActive
                                        ? 'border-primary'
                                        : 'border-border hover:border-primary/50',
                                )}
                            >
                                <Image
                                    src={image.url}
                                    alt={t('thumbnailAlt', { index: index + 1 })}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                    // Only the first thumbnail gets priority (matches first main image)
                                    priority={index === 0}
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Fullscreen Lightbox (Portal) ── */}
            {lightboxOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
                    onClick={() => setLightboxOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Image viewer"
                >
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-6 right-6 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        aria-label="Close"
                    >
                        <X className="size-5" />
                    </button>

                    {/* Previous */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + images.length) % images.length); }}
                            className="absolute left-6 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="size-6" />
                        </button>
                    )}

                    {/* Next */}
                    {images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % images.length); }}
                            className="absolute right-6 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                            aria-label="Next image"
                        >
                            <ChevronRight className="size-6" />
                        </button>
                    )}

                    {/* Image */}
                    <div
                        className="relative w-[85vw] h-[85vh] max-w-4xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Image
                            src={images[lightboxIndex]?.url ?? ''}
                            alt={`Product image ${lightboxIndex + 1}`}
                            fill
                            sizes="85vw"
                            className="object-contain"
                            priority
                        />
                    </div>

                    {/* Counter */}
                    {images.length > 1 && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
                            {lightboxIndex + 1} / {images.length}
                        </div>
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
}

export default ProductImages;
