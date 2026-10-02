import { cn } from '@/lib/utils'

/* -----------------------------------------------------------------------------
 * Base Shimmer Component
 * ----------------------------------------------------------------------------- */

interface ShimmerProps {
  className?: string
  variant?: 'default' | 'subtle' | 'strong'
  children?: React.ReactNode
}

export function Shimmer({
  className,
  variant = 'default',
  children,
}: ShimmerProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md',
        {
          'bg-accent': variant === 'default',
          'bg-muted/50': variant === 'subtle',
          'bg-muted': variant === 'strong',
        },
        className
      )}
    >
      {children}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Card - For stat cards, info cards, etc.
 * ----------------------------------------------------------------------------- */

interface ShimmerCardProps {
  className?: string
  icon?: boolean
  lines?: number
}

export function ShimmerCard({
  className,
  icon = true,
  lines = 2,
}: ShimmerCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 space-y-3',
        className
      )}
    >
      {icon && (
        <div className="flex items-center justify-between">
          <Shimmer className="h-10 w-10 rounded-full" variant="subtle" />
          <Shimmer className="h-6 w-16" variant="subtle" />
        </div>
      )}
      <div className="space-y-2">
        <Shimmer className="h-4 w-3/4" variant="subtle" />
        {lines > 1 && <Shimmer className="h-4 w-1/2" variant="subtle" />}
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Table - For table rows with shimmer effect
 * ----------------------------------------------------------------------------- */

interface ShimmerTableProps {
  rows?: number
  columns?: number
  className?: string
  showHeader?: boolean
}

export function ShimmerTable({
  rows = 5,
  columns = 5,
  className,
  showHeader = true,
}: ShimmerTableProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showHeader && (
        <div className="flex gap-4 pb-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Shimmer
              key={`header-${i}`}
              className="h-8 flex-1"
              variant="strong"
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Shimmer
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-12 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Text - For text lines
 * ----------------------------------------------------------------------------- */

interface ShimmerTextProps {
  lines?: number
  className?: string
}

export function ShimmerText({ lines = 3, className }: ShimmerTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
          variant="subtle"
        />
      ))}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Avatar - For circular avatars
 * ----------------------------------------------------------------------------- */

interface ShimmerAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ShimmerAvatar({
  size = 'md',
  className,
}: ShimmerAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return (
    <Shimmer
      className={cn(sizeClasses[size], 'rounded-full', className)}
      variant="subtle"
    />
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Button - For button-shaped placeholders
 * ----------------------------------------------------------------------------- */

interface ShimmerButtonProps {
  width?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

export function ShimmerButton({
  width = 'md',
  className,
}: ShimmerButtonProps) {
  const widthClasses = {
    sm: 'w-16',
    md: 'w-24',
    lg: 'w-32',
    full: 'w-full',
  }

  return (
    <Shimmer
      className={cn(
        'h-10 rounded-md',
        widthClasses[width],
        className
      )}
      variant="subtle"
    />
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Chart - For chart area placeholders
 * ----------------------------------------------------------------------------- */

interface ShimmerChartProps {
  height?: string
  className?: string
  showAxes?: boolean
}

export function ShimmerChart({
  height = 'h-64',
  className,
  showAxes = true,
}: ShimmerChartProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {showAxes && (
        <div className="flex items-end justify-between gap-2 px-4">
          <Shimmer className="h-full w-8" variant="subtle" />
          <div className="flex-1 h-full" />
          <Shimmer className="h-full w-8" variant="subtle" />
        </div>
      )}
      <div className={cn('relative', height)}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full flex items-end justify-center gap-1 px-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <Shimmer
                key={i}
                className={cn(
                  'flex-1 rounded-t-sm',
                  i % 3 === 0 ? 'h-3/4' : i % 3 === 1 ? 'h-1/2' : 'h-1/4'
                )}
              />
            ))}
          </div>
        </div>
      </div>
      {showAxes && (
        <div className="flex justify-between px-8 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-8" variant="subtle" />
          ))}
        </div>
      )}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Map - For map container placeholders
 * ----------------------------------------------------------------------------- */

interface ShimmerMapProps {
  className?: string
  showMarker?: boolean
}

export function ShimmerMap({ className, showMarker = true }: ShimmerMapProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden bg-muted',
        className
      )}
    >
      {/* Map background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Optional marker */}
      {showMarker && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <Shimmer className="h-12 w-12 rounded-full" variant="subtle" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-muted" />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Stats Grid - For dashboard stats cards
 * ----------------------------------------------------------------------------- */

interface ShimmerStatsGridProps {
  count?: number
  className?: string
}

export function ShimmerStatsGrid({
  count = 5,
  className,
}: ShimmerStatsGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Form - For form field placeholders
 * ----------------------------------------------------------------------------- */

interface ShimmerFormProps {
  fields?: number
  className?: string
}

export function ShimmerForm({ fields = 4, className }: ShimmerFormProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Shimmer className="h-4 w-24" variant="subtle" />
          <Shimmer className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer List - For list items
 * ----------------------------------------------------------------------------- */

interface ShimmerListProps {
  items?: number
  className?: string
}

export function ShimmerList({ items = 5, className }: ShimmerListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <ShimmerAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" variant="subtle" />
            <Shimmer className="h-3 w-1/2" variant="subtle" />
          </div>
          <Shimmer className="h-8 w-20" variant="subtle" />
        </div>
      ))}
    </div>
  )
}

/* -----------------------------------------------------------------------------
 * Shimmer Image - For image placeholders
 * ----------------------------------------------------------------------------- */

interface ShimmerImageProps {
  className?: string
  aspectRatio?: 'square' | 'video' | 'portrait'
}

export function ShimmerImage({
  className,
  aspectRatio = 'square',
}: ShimmerImageProps) {
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  }

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden bg-muted',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Shimmer className="h-16 w-16 rounded-full" variant="subtle" />
      </div>
    </div>
  )
}
