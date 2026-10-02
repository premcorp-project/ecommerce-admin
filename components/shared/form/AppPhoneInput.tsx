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
import { useTranslations } from 'next-intl';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface AppPhoneFieldProps {
  label?: string;
  name: string;
  className?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  placeholder?: string;
  id?: string;
  containerClassName?: string;
  disabled?: boolean;
  requiredAsterisk?: boolean;
  maxDigits?: number;
}

export const AppPhoneField = ({
  label,
  name,
  className,
  labelClassName,
  error: errorProp,
  helperText,
  showErrorStrategy = 'touchedOrSubmit',
  placeholder,
  id,
  containerClassName,
  disabled,
  requiredAsterisk,
  maxDigits = 15,
}: AppPhoneFieldProps) => {
  const t = useTranslations('appPhoneInput');
  const resolvedPlaceholder = placeholder ?? t('enterPhoneNumber');
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  const hasFormik = Boolean(formik && name);
  const currentValue = hasFormik ? formik!.values[name] : '';
  const normalizedValue =
    typeof currentValue === 'string' && currentValue.trim().length > 0
      ? currentValue
      : undefined;

  const formikError = resolveFormikError(
    formik,
    name as string | undefined,
    showErrorStrategy,
  );
  const error = errorProp ?? formikError;

  const generatedId = React.useId();
  const inputId = id ?? (name ? `${name}-input` : generatedId);
  const helperId = error || helperText ? `${inputId}-helper` : undefined;

  const getDigitCount = React.useCallback((value: string) => {
    return (value.match(/\d/g) || []).length;
  }, []);

  const clampPhoneDigits = React.useCallback(
    (value: string) => {
      const hasPlus = value.startsWith('+');
      const digits = value.replace(/\D/g, '').slice(0, maxDigits);

      if (!digits) return '';
      return `${hasPlus ? '+' : ''}${digits}`;
    },
    [maxDigits],
  );

  const LimitedInputComponent = React.useMemo(() => {
    const Component = React.forwardRef<
      HTMLInputElement,
      React.InputHTMLAttributes<HTMLInputElement>
    >((props, ref) => {
      const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        props.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key.length !== 1 || !/\d/.test(event.key)) return;

        const input = event.currentTarget;
        const selectionStart = input.selectionStart ?? input.value.length;
        const selectionEnd = input.selectionEnd ?? selectionStart;
        const selectedText = input.value.slice(selectionStart, selectionEnd);
        const currentDigits = getDigitCount(input.value);
        const selectedDigits = getDigitCount(selectedText);

        if (currentDigits - selectedDigits + 1 > maxDigits) {
          event.preventDefault();
        }
      };

      const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        props.onPaste?.(event);
        if (event.defaultPrevented) return;

        const input = event.currentTarget;
        const selectionStart = input.selectionStart ?? input.value.length;
        const selectionEnd = input.selectionEnd ?? selectionStart;
        const selectedText = input.value.slice(selectionStart, selectionEnd);
        const currentDigits = getDigitCount(input.value);
        const selectedDigits = getDigitCount(selectedText);
        const availableDigits = maxDigits - (currentDigits - selectedDigits);
        const pastedDigits = getDigitCount(
          event.clipboardData.getData('text') || '',
        );

        if (pastedDigits > availableDigits) {
          event.preventDefault();
        }
      };

      return (
        <input
          {...props}
          ref={ref}
          inputMode="tel"
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      );
    });

    Component.displayName = 'LimitedPhoneInputComponent';
    return Component;
  }, [getDigitCount, maxDigits]);

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-[15px] font-medium', labelClassName)}
        >
          {label}
          {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <PhoneInput
        id={inputId}
        name={name}
        international
        defaultCountry="PK"
        value={normalizedValue}
        onChange={(value) => {
          const nextValue = value || '';
          const safeValue =
            getDigitCount(nextValue) > maxDigits
              ? clampPhoneDigits(nextValue)
              : nextValue;

          if (hasFormik) {
            formik!.setFieldValue(name, safeValue);
          }
        }}
        onBlur={() => {
          if (hasFormik) {
            formik!.setFieldTouched(name, true);
          }
        }}
        disabled={disabled}
        placeholder={resolvedPlaceholder}
        inputComponent={LimitedInputComponent}
        className={cn(
          'w-full h-11 rounded-[12px] bg-transparent text-sm font-normal border px-3 outline-none focus:outline-none',
          error
            ? 'border-destructive focus:border-destructive'
            : 'border-stroke focus:border-primary',
          className,
        )}
        
        aria-invalid={!!error}
        aria-describedby={helperId}
      />

      {(error || helperText) && (
        <p
          id={helperId}
          className={cn(
            'text-sm mt-1',
            error ? 'text-destructive' : 'text-mute',
          )}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
};

AppPhoneField.displayName = 'AppPhoneField';
