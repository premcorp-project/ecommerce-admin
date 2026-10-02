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
import { Label } from '@/components/ui/label';

interface AppRadioButtonProps {
  label: string;
  name: string;
  value: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  disabled?: boolean;
}

export function AppRadioButton({
  label,
  name,
  value,
  checked: checkedProp,
  onChange: onChangeProp,
  className,
  labelClassName,
  error: errorProp,
  helperText,
  showErrorStrategy = 'touchedOrSubmit',
  disabled,
}: AppRadioButtonProps) {
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  const hasFormik = Boolean(formik && name);

  // Determine the current value: Formik's value if available, otherwise checkedProp
  const isChecked = hasFormik ? formik!.values[name] === value : checkedProp;

  const formikError = resolveFormikError(
    formik,
    name as string | undefined,
    showErrorStrategy,
  );
  const error = errorProp ?? formikError;

  const generatedId = React.useId();
  const inputId = `${name}-${value}-${generatedId}`;

  const handleChange = () => {
    if (disabled) return;

    if (hasFormik) {
      formik!.setFieldValue(name, value);
    }
    if (onChangeProp) {
      onChangeProp(value);
    }
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex gap-2 items-center">
        <input
          type="radio"
          id={inputId}
          name={name}
          value={value}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'w-4 h-4 cursor-pointer accent-primary',
            error && 'border-destructive',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />
        <Label
          htmlFor={inputId}
          className={cn(
            'cursor-pointer text-[15px] font-medium',
            disabled && 'cursor-not-allowed opacity-50',
            labelClassName,
          )}
        >
          {label}
        </Label>
      </div>
      {(error || helperText) && (
        <p className={cn('text-sm', error ? 'text-destructive' : 'text-mute')}>
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}
