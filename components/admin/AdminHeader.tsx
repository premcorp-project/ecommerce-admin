'use client';

import { LanguageSelector } from '@/components/admin/LanguageSelector';
import { AppAlertDialog } from '@/components/shared/AppAlertDialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { useNotificationSoundStore } from '@/lib/stores/notification-sound-store';
import { Bell, BellOff, ChevronDown, ChevronRight, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/**
 * Generate breadcrumb segments from the current pathname.
 * e.g. /admin/products → [{ label: 'Admin', href: '/admin' }, { label: 'Products', href: '/admin/products' }]
 */
function useBreadcrumbs() {
  const pathname = usePathname();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      // If segment looks like an order ID (e.g. ORD-XXXX) keep it as-is, otherwise title-case it
      const isId = /^[A-Z0-9]+-[A-Z0-9]+/.test(segment) || segment.length > 20;
      const label = isId
        ? segment
        : segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      return { label, href };
    });
  }, [pathname]);
}

function SoundToggle() {
  const { enabled, toggle } = useNotificationSoundStore();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={enabled ? 'Mute notifications' : 'Unmute notifications'}
      title={enabled ? 'Notification sound on' : 'Notification sound off'}
    >
      {enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
    </Button>
  );
}

export function AdminHeader() {
  const router = useRouter();
  const { user, clearAuth } = useAdminAuthStore();
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const breadcrumbs = useBreadcrumbs();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    setShowLogoutAlert(false);
    clearAuth();
    router.push('/login');
  };

  const userInitial = user?.name
    ? user.name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  return (
    <>
      <header className="w-full bg-background h-[64px] px-6 border-b border-border flex items-center justify-between sticky top-0 z-30">
        {/* Left section: toggle + breadcrumbs */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              toggleSidebar();
              setOpenMobile(true);
            }}
            aria-label="Toggle sidebar"
          >
            <Menu className="size-5" />
          </Button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              // 'admin' segment has no page — skip making it a link
              const isClickable = !isLast && crumb.label.toLowerCase() !== 'admin';
              return (
                <span key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="size-3.5 shrink-0" />}
                  {isLast ? (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  ) : isClickable ? (
                    <button
                      type="button"
                      onClick={() => router.push(crumb.href)}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </span>
              );
            })}
          </nav>
        </div>

        {/* Right section: sound toggle + theme toggle + language selector + user dropdown */}
        <div className="flex items-center gap-2">
          {/* Notification Sound Toggle */}
          {mounted && (
            <SoundToggle />
          )}

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </Button>
          )}

          {/* Language Selector */}
          <LanguageSelector />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 cursor-pointer outline-none"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  {userInitial}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium leading-tight">
                    {user?.name || 'Admin'}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {user?.email || ''}
                  </span>
                </div>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2 p-3">
                <User className="size-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name || 'Admin'}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email || ''}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setShowLogoutAlert(true)}
              >
                <LogOut className="size-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AppAlertDialog
        title="Logout"
        subTitle="Are you sure you want to logout?"
        description="You will be redirected to the login page."
        open={showLogoutAlert}
        onOpenChange={(val) => setShowLogoutAlert(val)}
        variant="delete"
        confirmLabel="Logout"
        onConfirm={handleLogout}
      />
    </>
  );
}
