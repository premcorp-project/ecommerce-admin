'use client';

import * as React from 'react';
import {
  FormikContext,
  type FormikContextType,
  type FormikValues,
} from 'formik';
import {
  resolveFormikError,
  type ErrorStrategy,
} from '@/lib/resolveFormikError';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

type AppSwitchProps = {
  name: string;
  label?: string;
  helperText?: string;
  className?: string;
  labelClassName?: string;
  showErrorStrategy?: ErrorStrategy;
  disabled?: boolean;
  requiredAsterisk?: boolean;
  onChange?: (checked: boolean) => void;
};

export const AppSwitch: React.FC<AppSwitchProps> = ({
  name,
  label,
  helperText,
  className,
  labelClassName,
  showErrorStrategy = 'touchedOrSubmit',
  disabled,
  requiredAsterisk,
  onChange,
}) => {
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );
  if (!formik) throw new Error('AppSwitch must be used inside a Formik form');

  const error = resolveFormikError(formik, name, showErrorStrategy);
  const checked = Boolean(formik.values?.[name]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className={cn('text-[15px] font-medium', labelClassName)}>
          {label}
          {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="flex items-center gap-3">
        <Switch
          checked={checked}
          onCheckedChange={(v) => {
            formik.setFieldValue(name, v);
            onChange?.(v);
          }}
          onBlur={() => formik.setFieldTouched(name, true, true)}
          disabled={disabled}
        />
        <span className="text-sm text-muted-foreground">
          {checked ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      {(error || helperText) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
};
