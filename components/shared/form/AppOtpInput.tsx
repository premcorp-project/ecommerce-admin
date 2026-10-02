'use client';

import {
    resolveFormikError,
    type ErrorStrategy,
} from '@/lib/resolveFormikError';
import { cn } from '@/lib/utils';
import {
    FormikContext,
    type FormikContextType,
    type FormikValues,
} from 'formik';
import * as React from 'react';


import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

type AppOtpInputProps = {
  name?: string;
  label?: string;
  helperText?: string;
  error?: string;
  showErrorStrategy?: ErrorStrategy;

  maxLength?: number;
  value?: string;
  onChange?: (val: string) => void;
  onComplete?: (val: string) => void;

  className?: string;
  labelClassName?: string;
  groupClassName?: string;
  slotClassName?: string;
  requiredAsterisk?: boolean;
};

export const AppOtpInput = React.forwardRef<HTMLDivElement, AppOtpInputProps>(
  (
    {
      name,
      label,
      helperText,
      error: errorProp,
      showErrorStrategy = 'touchedOrSubmit',
      maxLength = 6,
      value,
      onChange,
      onComplete,
      className,
      labelClassName,
      groupClassName,
      slotClassName,
      requiredAsterisk,
    },
    ref,
  ) => {
    const formik = React.useContext(
      FormikContext as unknown as React.Context<
        FormikContextType<FormikValues> | undefined
      >,
    );
    const hasFormik = Boolean(formik && name);

    const [inner, setInner] = React.useState('');
    const code = hasFormik ? (formik!.getFieldProps(name as string).value as string) ?? '' : value ?? inner;

    const setCode = (next: string) => {
      const clipped = next.slice(0, maxLength).replace(/\D/g, '');
      if (hasFormik) formik!.setFieldValue(name as string, clipped);
      else setInner(clipped);
      onChange?.(clipped);
      if (clipped.length === maxLength) onComplete?.(clipped);
    };

    const formikError = resolveFormikError(
      formik,
      name as string | undefined,
      showErrorStrategy,
    );
    const error = errorProp ?? formikError;

    const generatedId = React.useId();
    const groupId = name ? `${name}-otp` : generatedId;
    const helperId = error || helperText ? `${groupId}-helper` : undefined;

    return (
      <div ref={ref} className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label htmlFor={groupId} className={cn('text-[15px] font-medium', labelClassName)}>
            {label}
            {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <InputOTP
          id={groupId}
          value={code}
          onChange={(val) => setCode(val)}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={helperId}
        >
          <InputOTPGroup
            className={cn(
              'flex items-center justify-between gap-3 sm:gap-4',
              groupClassName,
            )}
          >
            {Array.from({ length: maxLength }).map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                inputMode="numeric"
                className={cn(
                  'first:rounded-[8px] last:rounded-[8px] h-[50px] w-[50px]',
                  'text-lg text-center',
                  'rounded-[8px] border bg-card',
                  'shadow-[0_1px_0_0_rgba(16,24,40,0.04)]',
                  'border-stroke',
                  ' outline-none ring-0 data-[active=true]:border-[1.5px] data-[active=true]:border-primary data-[active=true]:ring-0',
                  '[&>input]:caret-transparent',
                  error && 'border-destructive focus:border-destructive',
                  slotClassName,
                )}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {(error || helperText) && (
          <p
            id={helperId}
            className={cn('text-sm mt-1', error ? 'text-destructive' : 'text-mute')}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);

AppOtpInput.displayName = 'AppOtpInput';
