'use client';

import { cn } from '@/lib/utils';
import { useField } from 'formik';
import * as React from 'react';

interface AppCheckBoxProps {
  name: string;
  label: string;
  value?: string;
  onChange?: (checked: boolean) => void;
}

export function AppCheckBox({ name, label, value, onChange }: AppCheckBoxProps) {
  const [field] = useField({ name, type: 'checkbox', ...(value && { value }) });
  const inputId = React.useId();

  return (
    <div className="flex items-center gap-2">
      <input
        {...field}
        id={inputId}
        type="checkbox"
        className="h-4 w-4 cursor-pointer"
        onChange={(event) => {
          field.onChange(event);
          onChange?.(event.target.checked);
        }}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'text-sm font-medium cursor-pointer transition-colors',
          field.checked ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </label>
    </div>
  );
}
