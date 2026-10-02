'use client';

/**
 * TagFilterSection — horizontal tag filter bar above the product grid.
 * Fetches active tags and renders as scrollable, toggleable chips.
 * Uses slugs in the URL for clean, SEO-friendly paths.
 */

import { usePublicQuery } from '@/lib/api/public-hooks';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

interface Tag {
    _id: string;
    name: string;
    slug: string;
    image?: { url: string; publicId: string } | null;
}

export function TagFilterSection() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedTags = (searchParams.get('tags') ?? '').split(',').filter(Boolean);

    const { data } = usePublicQuery<any>(
        ['public', 'tags'],
        '/catalog/tags',
    );

    const tags: Tag[] = (data as any)?.data?.tags ?? (data as any)?.tags ?? [];

    if (tags.length === 0) return null;

    const toggleTag = (tagSlug: string) => {
        const updated = selectedTags.includes(tagSlug)
            ? selectedTags.filter((s) => s !== tagSlug)
            : [...selectedTags, tagSlug];

        const params = new URLSearchParams(searchParams.toString());
        if (updated.length > 0) {
            params.set('tags', updated.join(','));
        } else {
            params.delete('tags');
        }
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearTags = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('tags');
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.slug);
                return (
                    <button
                        key={tag._id}
                        type="button"
                        onClick={() => toggleTag(tag.slug)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium border whitespace-nowrap transition-all duration-150 ${
                            isSelected
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                    >
                        {tag.image?.url && (
                            <img src={tag.image.url} alt="" className="size-4 rounded-full object-contain" />
                        )}
                        {tag.name}
                        {isSelected && <span className="ml-0.5 opacity-70">✕</span>}
                    </button>
                );
            })}

            {/* Clear all tags button — only when tags are selected */}
            {selectedTags.length > 0 && (
                <button
                    type="button"
                    onClick={clearTags}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-[var(--radius)] text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30 whitespace-nowrap transition-colors"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
