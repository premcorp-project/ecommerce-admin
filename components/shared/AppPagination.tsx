'use client';

import type { MouseEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useQueryParams } from '@/hooks/use-query-params';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TLimitType = 10 | 25 | 50 | 100;

interface AppPaginationProps {
  page: number;
  totalPages: number;
  totalData: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: TLimitType) => void;
  defaultLimit: TLimitType;
  selectedRows?: number;
  className?: string;
}

export default function AppPagination({
  page,
  totalPages,
  totalData,
  onPageChange,
  onLimitChange,
  defaultLimit,
  selectedRows,
  className,
}: AppPaginationProps) {
  const t = useTranslations('common');
  const { setParams, getParam } = useQueryParams();

  const limit = getParam('limit') ?? defaultLimit;

  const doSetPage = (newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setParams({ page: String(newPage) });
    }
  };

  const doSetLimit = (newLimit: TLimitType) => {
    if (onLimitChange) {
      onLimitChange(newLimit);
    } else {
      setParams({ limit: String(newLimit), page: '1' });
    }
  };

  const handleFirst = (e?: MouseEvent) => {
    e?.preventDefault();
    if (page > 1) doSetPage(1);
  };

  const handlePrevious = (e?: MouseEvent) => {
    e?.preventDefault();
    if (page > 1) {
      doSetPage(page - 1);
    }
  };

  const handleNext = (e?: MouseEvent) => {
    e?.preventDefault();
    if (page < totalPages) {
      doSetPage(page + 1);
    }
  };

  const handleLast = (e?: MouseEvent) => {
    e?.preventDefault();
    if (page < totalPages) doSetPage(totalPages);
  };

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <div>
        {' '}
        {selectedRows && (
          <div className="text-sm text-muted-foreground">
            {t('rowsSelected', { selectedRows, totalData })}
          </div>
        )}
      </div>
      <div className="w-full flex items-center justify-between gap-4">
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-sm">{t('rowsPerPage')}</span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => doSetLimit(Number(value) as TLimitType)}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((item) => (
                <SelectItem value={`${item}`} key={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className=" flex-shrink-0 text-sm">
            {t('pageOfTotalPages', { page, totalPages })}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => handleFirst(e)}
                  className={cn('border shadow-sm', {
                    'pointer-events-none opacity-50': page === 1,
                  })}
                  aria-disabled={page === 1}
                  tabIndex={page === 1 ? -1 : undefined}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => handlePrevious(e)}
                  className={cn('border shadow-sm', {
                    'pointer-events-none opacity-50': page === 1,
                  })}
                  aria-disabled={page === 1}
                  tabIndex={page === 1 ? -1 : undefined}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => handleNext(e)}
                  className={cn('border shadow-sm', {
                    'pointer-events-none opacity-50': page === totalPages,
                  })}
                  aria-disabled={page === totalPages}
                  tabIndex={page === totalPages ? -1 : undefined}
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => handleLast(e)}
                  className={cn('border shadow-sm', {
                    'pointer-events-none opacity-50': page === totalPages,
                  })}
                  aria-disabled={page === totalPages}
                  tabIndex={page === totalPages ? -1 : undefined}
                >
                  <ChevronsRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
