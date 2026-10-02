'use client';

import React from 'react';

import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminSSEListener } from '@/components/admin/AdminSSEListener';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

// ---------- Error Boundary ----------

interface ErrorBoundaryState {
  hasError: boolean;
}

class AdminContentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AdminContentErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------- Layout ----------

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <AdminSSEListener />
        <AdminSidebar />
        <SidebarInset className="flex flex-col w-full h-screen overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-4">
            <AdminContentErrorBoundary>
              {children}
            </AdminContentErrorBoundary>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
