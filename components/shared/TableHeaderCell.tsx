'use client';

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableHead } from '../ui/table';

type SortConfig = {
  key: string | null;
  direction: 'ascending' | 'descending';
} | null;
type Props = {
  label: string;
  sortKey: string; // now accepts nested path like "userProfile.user.email"
  requestSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  sortConfig: SortConfig;
  containerClass?: string;
};
export default function TableHeaderCell({
  label,
  sortKey,
  requestSort,
  sortConfig,
  align = 'left',
  containerClass = '',
}: Props) {
  const isActive = sortConfig?.key === sortKey;
  const icon = !isActive ? (
    <ChevronsUpDown size={18} className="text-mute" />
  ) : sortConfig!.direction === 'ascending' ? (
    <ChevronUp size={18} className="text-blue-500" />
  ) : (
    <ChevronDown size={18} className="text-blue-500" />
  );
  return (
    <TableHead
      className={cn(
        'px-4 py-4 font-medium select-none',
        align === 'center' && 'text-center',
        containerClass,
      )}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === 'center' ? 'justify-center' : ''
        }`}
      >
        <span>{label}</span>
        <button
          className="cursor-pointer text-mute"
          onClick={() => requestSort(sortKey)}
        >
          {icon}
        </button>
      </div>
    </TableHead>
  );
}
