import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, Locale, locales } from './i18n/config';

export function proxy(request: NextRequest) {
  const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale;
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', validLocale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
