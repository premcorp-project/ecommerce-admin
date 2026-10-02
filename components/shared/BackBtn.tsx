'use client';

import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type BackBtnProps = {
  label?: string;
  href?: string;
  className?: string;
};

const style =
  'inline-flex items-center gap-1 hover:text-primary cursor-pointer text-[15px]';

const BackBtn: React.FC<BackBtnProps> = ({ label, href, className }) => {
  const t = useTranslations('backBtn');
  const resolvedLabel = label ?? t('back');
  const router = useRouter();

  const Inner = (
    <>
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span>{resolvedLabel}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          style,
          className,
        )}
        aria-label={resolvedLabel}
      >
        {Inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        style,
        className,
      )}
      aria-label={resolvedLabel}
    >
      {Inner}
    </button>
  );
};

export { BackBtn };
