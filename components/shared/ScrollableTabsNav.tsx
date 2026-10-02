'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHorizontalOverflow } from '@/hooks/use-horizontel-overflow';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type TabItem = { value: string; label: string; showDot?: boolean };

type Props = {
  tabs: TabItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  triggerClassName?: string;
  showSelectOnSmall?: boolean;
  right?: React.ReactNode;};

export default function ScrollableTabsNav({
  tabs,
  value,
  onChange,
  className,
  triggerClassName,
  showSelectOnSmall = true,
  right,
}: Props) {
  const t = useTranslations('scrollableTabsNav');
  const { ref, showLeft, showRight, scrollByAmount } =
    useHorizontalOverflow<HTMLDivElement>();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    const activeTabIndex = tabs.findIndex((t) => t.value === value);
    if (activeTabIndex !== -1) {
      const activeTab = tabRefs.current[activeTabIndex];
      if (activeTab) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [value, tabs]);

  return (
    <>
      {/* on Mobile: shift to <select> */}
      {showSelectOnSmall && (
        <div className="sm:hidden mb-3">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder={t('selectSection')} />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ≥sm: scrollable tab bar with arrows */}
      <div className={clsx('relative hidden sm:block', className)}>
        {showLeft && (
          <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-background to-transparent rounded-l-md z-[5]" />
        )}
        {showRight && (
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent rounded-r-md z-[5]" />
        )}

        {showLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-card/90 shadow p-1.5 hover:bg-card transition-colors"
            aria-label={t('scrollLeft')}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {showRight && (
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-card/90 shadow p-1.5 hover:bg-card transition-colors"
            aria-label={t('scrollRight')}
          >
            <ArrowRight size={18} />
          </button>
        )}

        <div className="relative ">
          <TabsList
            ref={ref}
            className={clsx(
              ' bg-transparent overflow-x-auto justify-normal overflow-y-hidden gap-0',
              'no-scrollbar whitespace-nowrap h-11 shadow-none',
              'scroll-smooth touch-pan-x w-full !p-0',
            )}
            style={{
              scrollPaddingLeft: showLeft ? '2.5rem' : '0',
              scrollPaddingRight: showRight ? '2.5rem' : '0',
            }}
          >
            {tabs.map((t, idx) => (
              <TabsTrigger
                // ref={(el) => (tabRefs.current[idx] = el)}
                key={`${t.value}-${idx}`}
                value={t.value}
                className={clsx(
                  `
                  relative h-11
                  text-sm font-medium flex-none
                  px-3 sm:px-5 
                  data-[state=active]:!bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary
                  bg-transparent border border-border border-l-1 border-r-0 last:border-r-1  shadow-xs rounded-none
                  first:!rounded-l-lg last:!rounded-r-lg
                  min-w-fit
                  transition-colors duration-200 capitalize
              `,
                  idx === 0 && 'ml-0',
                  idx === tabs.length - 1 && 'mr-0',
                  triggerClassName,
                )}
                style={{
                  marginLeft: idx === 0 && showLeft ? '2.5rem' : undefined,
                  marginRight:
                    idx === tabs.length - 1 && showRight ? '2.5rem' : undefined,
                }}
              >
                <span className="truncate">{t.label}</span>
                {t.showDot && (
                  <div className="absolute top-2 right-2.5 bg-help-red w-2 h-2 rounded-full" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {/* right side actions (e.g., Add button) */}
        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {right}
          </div>
        )}
      </div>
    </>
  );
}

// this is a generic component can be used everywhere in the project and responsiveness will be applied automatically
// How to use
{
  /* <ScrollableTabsNav 
    tabs={tabs.map((t) => ({ value: t, label: t }))}
    value={activeTab}
    onChange={(v) => dispatch(setActiveTab(v))}
    className="mb-0"
    triggerClassName="border-x"
/> */
}
