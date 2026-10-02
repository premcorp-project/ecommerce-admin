'use client';

/**
 * TagPicker — multi-select tag picker for the product form.
 * Fetches active tags from GET /catalog/tags and renders as toggleable pills.
 */

import { useAdminQuery } from '@/lib/api/admin-hooks';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Tag {
    _id: string;
    name: string;
    image?: { url: string; publicId: string } | null;
}

interface TagPickerProps {
    value: string[];
    onChange: (tags: string[]) => void;
}

export function TagPicker({ value, onChange }: TagPickerProps) {
    const t = useTranslations('admin.products');

    const { data } = useAdminQuery<any>(
        ['admin', 'tags-active'],
        '/catalog/tags',
        { staleTime: 0 },
    );

    const tags: Tag[] = (data as any)?.data?.tags ?? (data as any)?.tags ?? [];

    const toggle = (tagId: string) => {
        if (value.includes(tagId)) {
            onChange(value.filter((id) => id !== tagId));
        } else {
            onChange([...value, tagId]);
        }
    };

    if (tags.length === 0) return null;

    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
                {t('form.tags')}
            </label>
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                    const isSelected = value.includes(tag._id);
                    return (
                        <button
                            key={tag._id}
                            type="button"
                            onClick={() => toggle(tag._id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius)] text-xs font-medium border transition-colors ${
                                isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-foreground border-border hover:border-primary/50'
                            }`}
                        >
                            {tag.image?.url && (
                                <img src={tag.image.url} alt="" className="size-3.5 rounded-sm object-contain" />
                            )}
                            {tag.name}
                            {isSelected && <X className="size-3" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
