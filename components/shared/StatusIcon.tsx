import React from 'react';

type StatusIconProps = {
  status: string;
  icon?: React.ReactNode;
  className?: string;
  iconClassName?: string;
};

export default function StatusIcon({
  status,
  icon,
  className = '',
  iconClassName = '',
}: StatusIconProps) {
  return (
    <span
      role="status"
      aria-label={status}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-muted-foreground text-xs ${className}`}
    >
      {icon && <span className={iconClassName}>{icon}</span>}
      <span className="whitespace-nowrap">{status}</span>
    </span>
  );
}
