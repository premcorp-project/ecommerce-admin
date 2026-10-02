'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import { localeNames, locales, type Locale } from '@/i18n/config';
import { setUserLocale } from '@/lib/locale';
import { useLocale } from 'next-intl';
import * as React from 'react';

export function LanguageSelector() {
  const currentLocale = useLocale();
  const [isPending, startTransition] = React.useTransition();

  const handleChange = (newLocale: string) => {
    startTransition(async () => {
      await setUserLocale(newLocale as Locale);
      // Force page refresh to apply the new locale
      window.location.reload();
    });
  };

  return (
    <Select
      value={currentLocale}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger
        className={`h-9 w-fit border-none shadow-none focus-visible:ring-0 ring-0 justify-between rounded-md px-3 [&>svg]:opacity-100 [&>svg]:text-foreground`}
        aria-label="Language"
      >
        <span className="font-medium">{localeNames[currentLocale as Locale]}</span>
      </SelectTrigger>

      <SelectContent align="end" className="min-w-[200px]">
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
