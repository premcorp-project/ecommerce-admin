'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

export interface StatCardItem {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  icon: React.ElementType;
}

export function StatCard({
  title,
  value,
  change,
  isPositive,
  icon: Icon,
}: StatCardItem) {
  const t = useTranslations('statCard');
  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full min-h-[120px] bg-card rounded-lg border p-3 sm:p-4 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {title}
            </p>
          </div>
          <div
            className="flex items-center justify-center flex-shrink-0 bg-muted p-2 rounded-lg"
          >
            <Icon size={18} className="sm:size-5" />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 truncate">
            {value}
          </p>
        </div>
        
        <div className="flex items-center gap-1 text-xs sm:text-sm flex-wrap">
          {isPositive ? (
            <TrendingUp className="size-3 sm:size-4 text-help-green flex-shrink-0" />
          ) : (
            <TrendingDown className="size-3 sm:size-4 text-destructive flex-shrink-0" />
          )}
          <span
            className={`flex-shrink-0 ${isPositive ? 'text-help-green' : 'text-destructive'}`}
          >
            {change}%
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap">
            {isPositive ? t('upFromYesterday') : t('downFromYesterday')}
          </span>
        </div>
      </div>
    </div>
  );
}
