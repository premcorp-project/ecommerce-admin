'use client';

import { cn } from '@/lib/utils';
import { memo, useState } from 'react';

interface ExpandableTextProps {
  text: string;
  startLength?: number;
  endLength?: number;
  className?: string;
}

const ExpandableText = ({ text, startLength = 6, endLength = 4, className }: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const start = text.slice(0, startLength);
  const end = text.slice(-endLength);

  return (
    <p
      onClick={toggleExpansion}
      className={
        cn('cursor-pointer whitespace-normal break-all inline-block hover:underline',
          className
        )
      }
    >
      {isExpanded ? text : `${start}...${end}`}
    </p>
  );
};

export default memo(ExpandableText);
