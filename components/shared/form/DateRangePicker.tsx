'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  placeholder: string;
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  buttonClassName?: string;
  label?: string;
  labelClassName?: string;
  requiredAsterisk?: boolean;
}

export function DateRangePicker({
  placeholder,
  className,
  date,
  onDateChange,
  buttonClassName,
  label,
  labelClassName,
  requiredAsterisk,
}: DateRangePickerProps) {
  return (
    <div className={cn('grid gap-2 rounded-[6px]', className)}>
      {label && (
        <label className={cn('text-[15px] font-medium', labelClassName)}>
          {label}
          {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              '!w-full h-11 rounded-[6px] pe-4 bg-transparent hover:bg-transparent text-sm text-primary font-normal border border-stroke focus:border-primary focus-visible:border-primary focus-visible:ring-0 outline-none',
              !date && 'text-muted-foreground',
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-1 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
