'use client';

import { Star, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryParams } from '@/hooks/use-query-params';
import { AppButton } from '@/components/shared/AppButton';
import { AppCheckBox } from '@/components/shared/AppCheckBox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface RatingFilterPopoverProps {
  paramKey?: string;
  value?: number[];
  onChange?: (ratings: number[]) => void;
  label?: string;
}

const RATINGS = [5, 4, 3, 2, 1];

export function RatingFilterPopover({
  paramKey = 'rating',
  value,
  onChange,
  label,
}: RatingFilterPopoverProps) {
  const t = useTranslations('ratingFilterPopover');
  const resolvedLabel = label ?? t('filter');
  const { getParam, setParams } = useQueryParams();
  const isControlled = Array.isArray(value);

  const currentRatings = isControlled
    ? value
    : getParam(paramKey)
      ? getParam(paramKey)!.split(',').map((val) => Number(val))
      : [];

  const toggleRating = (rating: number) => {
    const nextRatings = currentRatings.includes(rating)
      ? currentRatings.filter((r) => r !== rating)
      : [...currentRatings, rating];

    if (!isControlled) {
      setParams({
        [paramKey]: nextRatings.length ? nextRatings.join(',') : null,
        page: '1',
      });
    }

    onChange?.(nextRatings);
  };

  return (
    <Popover>
      <PopoverTrigger asChild className="h-11 w-40">
        <AppButton
          variant="mute"
          leftIcon={<SlidersHorizontal size={16} />}
          className="justify-start text-mute"
        >
          {resolvedLabel}
        </AppButton>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t('ratings')}</p>
          <div className="space-y-2">
            {RATINGS.map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <AppCheckBox
                  checked={currentRatings.includes(rating)}
                  onChange={() => toggleRating(rating)}
                />
                <span className="text-sm">{rating}</span>
                <Star className="h-4 w-4 fill-current text-orange-500" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
