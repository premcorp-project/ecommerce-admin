'use client';

import { ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const headingVariants = cva('font-semibold', {
  variants: {
    size: {
      '5xl': 'text-5xl lg:text-4xl md:text-3xl text-2xl',
      '4xl': 'text-4xl lg:text-3xl md:text-2xl text-xl',
      '3xl': 'text-3xl lg:text-2xl sm:text-xl text-lg',
      '2xl': 'text-2xl sm:text-xl text-lg',
      xl: 'text-xl sm:text-lg text-base',
      lg: 'text-lg text-base ',
      base: 'text-base sm:text-sm',
      sm: 'text-sm',
    },
  },
  defaultVariants: {
    size: '2xl',
  },
});

interface HeadingProps extends VariantProps<typeof headingVariants> {
  title: string;
  showBackBtn?: boolean;
  onBack?: () => void;
  subTitle?: string;
  titleClassName?: string;
  containerClassName?: string;
  as?: ElementType;
}

const Heading = ({
  title,
  showBackBtn = false,
  onBack,
  subTitle,
  size,
  titleClassName,
  containerClassName,
  as: Tag = 'h1',
}: HeadingProps) => {
  const router = useRouter();

  return (
    <div className={cn('flex items-center gap-2', containerClassName)}>
      {showBackBtn && (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.back())}
          className="cursor-pointer"
        >
          <ArrowLeft size={28} />
        </button>
      )}
      <div className="flex flex-col">
        <Tag className={cn(headingVariants({ size }), titleClassName)}>
          {title}
        </Tag>
        {subTitle && <span className="text-base text-mute">{subTitle}</span>}
      </div>
    </div>
  );
};

export { Heading };
