const NAV_WIDTHS = [130, 110, 150, 120, 140, 160, 115, 135];

/** Full-page dashboard skeleton shown while branding data is loading/refreshing */
export function BrandingShimmerLayout() {
  return (
    <div className="fixed inset-0 z-[9999] flex bg-background" aria-hidden="true">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-[250px] flex-col border-r bg-card p-4 gap-4 shrink-0">
        {/* Logo placeholder */}
        <div className="h-[48px] w-[120px] rounded bg-muted animate-pulse" />
        {/* Nav items */}
        <div className="mt-4 flex flex-col gap-3">
          {NAV_WIDTHS.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${w}px` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="h-[72px] border-b bg-card px-6 flex items-center justify-between shrink-0">
          <div className="h-5 w-5 rounded bg-muted animate-pulse md:hidden" />
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <div className="h-9 w-[250px] rounded-lg bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>

        {/* Page content skeleton */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Page title */}
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />

          {/* Stat cards row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg border bg-card p-4 flex flex-col justify-between">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="rounded-lg border bg-card">
            <div className="h-12 border-b px-4 flex items-center gap-4">
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 border-b px-4 flex items-center gap-4">
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
