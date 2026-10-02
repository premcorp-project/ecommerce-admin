'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AverageRatingDisplayProps {
  rating: number;
  label?: string;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function AverageRatingDisplay({
  rating,
  label,
  className,
  showLabel = true,
  size = 'md',
}: AverageRatingDisplayProps) {
  const t = useTranslations('averageRatingDisplay');
  const resolvedLabel = label ?? t('averageRating');
  const filledStars = Math.round(rating);
  const valueClass = size === 'sm' ? 'text-base' : 'text-2xl';
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={className}>
      {showLabel && (
        <p className="text-sm text-muted-foreground">{resolvedLabel}</p>
      )}
      <div className={showLabel ? 'mt-1 flex items-center gap-3' : 'flex items-center gap-2'}>
        <span className={`${valueClass} font-semibold`}>
          {rating.toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5 text-orange-500">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`${starClass} ${
                star <= filledStars ? 'fill-current' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
