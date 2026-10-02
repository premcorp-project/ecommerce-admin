import { cn } from '@/lib/utils';
import Link from 'next/link';

interface EmptyStateProps {
  /** Optional icon node rendered above the title */
  icon?: React.ReactNode;
  /** Primary heading text */
  title: string;
  /** Optional supporting description */
  description?: string;
  /** Label for the optional call-to-action button/link */
  ctaLabel?: string;
  /** href for the CTA — renders as a link when provided */
  ctaHref?: string;
  /** onClick handler for the CTA — renders as a button when provided (takes priority over ctaHref) */
  onCtaClick?: () => void;
  className?: string;
}

/**
 * EmptyState — centered empty state with icon, title, description, and optional CTA.
 *
 * Uses semantic tokens only. Suitable for empty lists, search results, etc.
 *
 * Requirements: 13.10
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
        className,
      )}
    >
      {icon && (
        <div className="flex items-center justify-center size-16 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-sm">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {ctaLabel && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-5 py-2.5',
            'text-sm font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          {ctaLabel}
        </button>
      )}

      {ctaLabel && ctaHref && !onCtaClick && (
        <Link
          href={ctaHref}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-5 py-2.5',
            'text-sm font-medium',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
