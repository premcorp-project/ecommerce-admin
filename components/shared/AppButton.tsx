// components/ui/app-button.tsx
'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type MotionValue } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

export const appButtonVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap select-none rounded-[8px] font-normal transition-colors focus-visible:outline-none disabled:opacity-70 disabled:cursor-not-allowed border leading-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm hover:[&_svg]:text-primary-foreground',
        secondary:
          'bg-transparent text-primary border border-primary hover:bg-primary hover:text-primary-foreground duration-200 ease-in-out hover:[&_svg]:text-primary-foreground',
        mute: 'bg-transparent border duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground',
        green:
          'bg-help-green border-transparent duration-200 ease-in-out hover:bg-help-green/90 text-white',
        red: 'bg-help-red border-transparent duration-200 ease-in-out hover:bg-help-red/90 text-white',
      },
      size: {
        sm: 'py-2 px-4 h-10 text-sm gap-2',
        md: 'py-2 px-4 h-10 text-sm 2xl:text-base gap-2.5',
        lg: 'py-2 px-4 h-11 text-sm md:text-base 2xl:text-lg gap-3',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type MotionButtonProps = React.ComponentProps<typeof motion.button>;
type MotionValuePrimitive = MotionValue<number> | MotionValue<string>;

export interface AppButtonProps
  extends Omit<MotionButtonProps, 'ref'>,
    VariantProps<typeof appButtonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode | MotionValuePrimitive;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,

      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          appButtonVariants({ variant, size }),
          '[&_svg]:block [&_svg]:shrink-0',
          className,
        )}
        disabled={isLoading || disabled}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.1, ease: 'easeInOut' }}
        {...props}
      >
        {leftIcon && !isLoading ? (
          <span className="flex items-center justify-center -ml-1">
            {leftIcon}
          </span>
        ) : null}

        <motion.span
          className={cn('flex items-center ', isLoading && 'opacity-0')}
        >
          {children}
        </motion.span>

        {isLoading && (
          <Loader2
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 animate-spin h-5 w-5"
          />
        )}

        {rightIcon && !isLoading ? (
          <span className="flex items-center justify-center -mr-1">
            {rightIcon}
          </span>
        ) : null}
      </motion.button>
    );
  },
);

AppButton.displayName = 'AppButton';
