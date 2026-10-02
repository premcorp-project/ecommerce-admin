'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import React from 'react';

const TLimitType = [10, 25, 50, 100] as const;
export type TLimitType = (typeof TLimitType)[number];

interface TableShimmerProps {
  limit: TLimitType;
  columns?: number;
}

const TableShimmer: React.FC<TableShimmerProps> = ({ limit, columns = 5 }) => {
  const widths = ['w-3/4', 'w-full', 'w-1/2', 'w-2/3', 'w-1/4', 'w-1/4' , 'w-1/4'];

  return (
    <>
      {[...Array(limit)].map((_, index) => (
        <TableRow key={index} className="!h-[55px]">
          {[...Array(columns)].map((_, colIndex) => (
            <TableCell key={colIndex}>
              <div className={`h-4 bg-muted rounded animate-pulse ${widths[colIndex % widths.length]}`}></div>
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export { TableShimmer };
