'use client';

import * as React from 'react';
import { AppInputField } from '@/components/shared/form/AppInput';

type AppTimeInputProps = Omit<
  React.ComponentProps<typeof AppInputField>,
  'type' | 'postfix'
>;

export default function AppTimeInput(props: AppTimeInputProps) {
  return (
    <AppInputField
      type="number"
      min={0}
      step="0.25"
      postfix={<span className="text-muted-foreground text-xs">hr</span>}
      {...props}
    />
  );
}

