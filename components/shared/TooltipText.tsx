'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TooltipTextProps = {
  children: React.ReactElement;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentClassName?: string;
  disabled?: boolean;
  asChild?: boolean;
};

const TooltipText: React.FC<TooltipTextProps> = ({
  children,
  content,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  delayDuration = 150,
  open,
  onOpenChange,
  contentClassName,
  disabled = false,
  asChild = true,
}) => {
  if (disabled) return children;

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger className="cursor-pointer" asChild={asChild}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'w-auto whitespace-pre-wrap break-words rounded-[12px] py-3 px-4 2xl:text-[15px] text-sm z-[70]',
            typeof content === 'string' &&
              content.length > 60 &&
              'max-w-[300px]',
            contentClassName,
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipText;
