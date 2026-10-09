'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import { cn } from '@/lib/utils';
import { filterSidebarItems } from '@/lib/utils/sidebar-filter';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

function stripQuery(path: string) {
  const q = path.indexOf('?');
  return q === -1 ? path : path.slice(0, q);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const currentPath = stripQuery(pathname ?? '');
  const t = useTranslations();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const role = useAdminAuthStore((state) => state.role);
  const permissions = useAdminAuthStore((state) => state.permissions);

  const filteredItems = filterSidebarItems(role, permissions);

  // Detect RTL direction
  const [isRtl, setIsRtl] = useState(false);
  useEffect(() => {
    setIsRtl(document.documentElement.dir === 'rtl');
  }, []);

  return (
    <Sidebar
      className="z-50"
      collapsible="icon"
      side={isRtl ? 'right' : 'left'}
    >
      <SidebarHeader className="p-0 pt-2">
        <div className="border-b pb-3 pt-1 px-2">
          <Link
            href="/admin/dashboard"
            className="block h-[48px] w-full max-w-[220px] relative"
          >
            <span className="flex h-full w-full items-center whitespace-nowrap text-lg font-semibold text-primary">
              {isCollapsed ? 'CB' : 'ChemTech'}
            </span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="pb-10">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-2 mt-4 px-2">
              {filteredItems.map((item) => {
                const isActive = currentPath === item.path;
                const Icon = item.icon;
                const label = t.has(item.translationKey)
                  ? t(item.translationKey)
                  : item.label;

                return (
                  <SidebarMenuItem key={item.path}>
                    <Link
                      href={item.path}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                      title={isCollapsed ? label : undefined}
                    >
                      <Icon
                        className="h-[18px] w-[18px] shrink-0"
                        aria-hidden
                      />
                      {!isCollapsed && <span>{label}</span>}
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
