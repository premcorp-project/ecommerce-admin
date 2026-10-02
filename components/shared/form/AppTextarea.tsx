// AppTextarea.tsx
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
import { Textarea } from '@/components/ui/textarea';

type NativeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

interface AppTextareaProps extends NativeTextareaProps {
  label?: string;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  requiredAsterisk?: boolean;
}

export const AppTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AppTextareaProps
>(
  (
    {
      label,
      className,
      labelClassName,
      containerClassName,
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
    const textareaId =
      (props.id as string) ?? (name ? `${name}-textarea` : generatedId);
    const helperId = error || helperText ? `${textareaId}-helper` : undefined;

    return (
      <div className={cn('flex flex-col items-start gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn('text-[15px] font-medium', labelClassName)}
          >
            {label}
            {requiredAsterisk && (
              <span className="text-destructive ml-1">*</span>
            )}
          </label>
        )}

        <Textarea
          ref={ref}
          id={textareaId}
          name={name}
          {...fieldProps}
          {...props}
          className={cn(
            '!w-full rounded-[12px] bg-transparent text-sm font-normal border focus-visible:ring-0 outline-none resize-none',
            error
              ? 'border-destructive focus:border-destructive'
              : 'border-stroke focus:border-primary focus-visible:border-primary',
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
  },
);

AppTextarea.displayName = 'AppTextarea';
