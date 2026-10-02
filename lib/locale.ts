'use server';

import { defaultLocale, locales, type Locale } from '@/i18n/config';
import { cookies } from 'next/headers';

export async function getUserLocale(): Promise<Locale> {
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value;

    if (locale && locales.includes(locale as Locale)) {
        return locale as Locale;
    }

    return defaultLocale;
}

export async function setUserLocale(locale: Locale) {
    const cookieStore = await cookies();
    cookieStore.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
}
