// AppPasswordField.tsx
'use client';

import * as React from 'react';
import {
  FormikContext,
  type FormikContextType,
  type FormikValues,
} from 'formik';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  resolveFormikError,
  type ErrorStrategy,
} from '@/lib/resolveFormikError';

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'prefix' | 'postfix'
>;

interface AppPasswordFieldProps extends NativeInputProps {
  label?: string;
  className?: string;
  labelClassName?: string;
  inputContainerClassName?: string;

  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  requiredAsterisk?: boolean;
}

export const AppPasswordField = React.forwardRef<
  HTMLInputElement,
  AppPasswordFieldProps
>(
  (
    {
      label,
      className,
      labelClassName,
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

    const [show, setShow] = React.useState(false);

    const hasFormik = Boolean(formik && name);
    const fieldProps = hasFormik ? formik!.getFieldProps(name as string) : {};

    const formikError = resolveFormikError(
      formik,
      name as string | undefined,
      showErrorStrategy,
    );
    const error = errorProp ?? formikError;

    // a11y ids
    const generatedId = React.useId();
    const inputId =
      (props.id as string) ?? (name ? `${name}-password` : generatedId);
    const helperId = error || helperText ? `${inputId}-helper` : undefined;
    const type = show ? 'text' : 'password';

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn('text-[15px] font-medium', labelClassName)}
          >
            {label}
            {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className={cn('relative w-full', inputContainerClassName)}>
          <Input
            ref={ref}
            id={inputId}
            name={name}
            {...fieldProps}
            {...props}
            // autoComplete={resolvedAutoComplete}
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            className={cn(
              '!w-full h-11 rounded-[12px] bg-transparent text-sm font-normal border focus-visible:ring-0 outline-none pr-10',
              error
                ? 'border-destructive focus:border-destructive'
                : 'border-stroke focus:border-primary focus-visible:border-primary',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={helperId}
            type={type}
          />

          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center',
              'h-6 w-6 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'hover:text-primary'
            )}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            tabIndex={0}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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

AppPasswordField.displayName = 'AppPasswordField';
