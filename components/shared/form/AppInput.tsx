// AppInputField.tsx
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
import { Input } from '@/components/ui/input';

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'prefix'
>;

interface AppInputFieldProps extends NativeInputProps {
  label?: string;
  className?: string;
  labelClassName?: string;

  prefix?: React.ReactNode;
  postfix?: React.ReactNode;

  prefixClassName?: string;
  postfixClassName?: string;
  inputContainerClassName?: string;

  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  requiredAsterisk?: boolean;
}

export const AppInputField = React.forwardRef<
  HTMLInputElement,
  AppInputFieldProps
>(
  (
    {
      label,
      className,
      labelClassName,
      prefix,
      postfix,
      prefixClassName,
      postfixClassName,
      inputContainerClassName,
      error: errorProp,
      helperText,
      name,
      showErrorStrategy = 'touchedOrSubmit',
      requiredAsterisk,
      ...props
    },
    ref,
  ) => {
    const formik = React.useContext(
      FormikContext as unknown as React.Context<
        FormikContextType<FormikValues> | undefined
      >,
    );

    const hasFormik = Boolean(formik && name);
    const hasPrefix = Boolean(prefix);
    const hasPostfix = Boolean(postfix);

    const fieldProps = hasFormik ? formik!.getFieldProps(name as string) : {};

    // Error: manual > Formik
    const formikError = resolveFormikError(
      formik,
      name as string | undefined,
      showErrorStrategy,
    );
    const error = errorProp ?? formikError;

    // a11y ids
    const generatedId = React.useId();
    const inputId =
      (props.id as string) ?? (name ? `${name}-input` : generatedId);
    const helperId = error || helperText ? `${inputId}-helper` : undefined;
    const isEmailInput = props.type === 'email';

    return (
      <div className="flex flex-col items-start gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn('text-[15px] font-medium', labelClassName)}
          >
            {label}
            {requiredAsterisk && (
              <span className="text-destructive ml-1">*</span>
            )}
          </label>
        )}

        <div className={cn('relative w-full', inputContainerClassName)}>
          {hasPrefix && (
            <span
              className={cn(
                'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center',
                prefixClassName,
              )}
            >
              {prefix}
            </span>
          )}

          <Input
            ref={ref}
            id={inputId}
            name={name}
            {...fieldProps}
            {...props}
            // autoComplete={resolvedAutoComplete}
            autoCapitalize={isEmailInput ? 'none' : props.autoCapitalize}
            autoCorrect={isEmailInput ? 'off' : props.autoCorrect}
            spellCheck={isEmailInput ? false : props.spellCheck}
            data-lpignore={isEmailInput ? 'true' : undefined}
            data-1p-ignore={isEmailInput ? 'true' : undefined}
            className={cn(
              '!w-full h-11 rounded-[12px] bg-transparent text-sm font-normal border focus-visible:ring-0 outline-none',
              hasPrefix && '!pl-10',
              hasPostfix && '!pr-10',
              error
                ? 'border-destructive focus:border-destructive'
                : 'border-stroke focus:border-primary focus-visible:border-primary',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={helperId}
          />

          {hasPostfix && (
            <span
              className={cn(
                'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center',
                postfixClassName,
              )}
            >
              {postfix}
            </span>
          )}
        </div>

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
  },
);

AppInputField.displayName = 'AppInputField';
