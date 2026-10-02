import { QueryProvider } from '@/components/provider/QueryProvider';
import { ThemeProvider } from '@/components/provider/ThemeProvider';
import MainLoader from '@/components/shared/MainLoader';
import '@/styles/chemibuild-loader.css';
import '@/styles/globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OttimoDirect Admin',
  description: 'OttimoDirect',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <NextTopLoader
            color="var(--primary)"
            showSpinner={false}
            height={3}
            shadow={false}
          />
          <NextIntlClientProvider locale={locale}>
            <QueryProvider>
              <Suspense fallback={<MainLoader />}>{children}</Suspense>
            </QueryProvider>
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
