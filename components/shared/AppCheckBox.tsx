'use client';

import * as React from 'react';
import {
  FormikContext,
  type FormikContextType,
  type FormikValues,
} from 'formik';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface AppCheckBoxProps {
  name?: string;
  label?: string;
  disabled?: boolean;
  requiredAsterisk?: boolean;
  className?: string;

  /** non-formik usage */
  checked?: boolean;
  onChange?: (checked: boolean) => void;

  /** manual error override */
  error?: string;
}

export const AppCheckBox: React.FC<AppCheckBoxProps> = ({
  name,
  label,
  disabled,
  requiredAsterisk = false,
  className,
  checked: checkedProp,
  onChange,
  error: errorProp,
}) => {
  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  const hasFormik = Boolean(formik && name);

  // value source: manual > formik
  const checked = checkedProp ?? (hasFormik ? formik!.values[name!] : false);

  // error source: manual > formik
  const formikError =
    hasFormik && formik!.touched[name!] && formik!.errors[name!]
      ? String(formik!.errors[name!])
      : undefined;

  const error = errorProp ?? formikError;

  const handleChange = (value: boolean | 'indeterminate') => {
    const nextValue = value === true;

    // update formik if present
    if (hasFormik) {
      formik!.setFieldValue(name!, nextValue);
    }

    // call consumer handler
    onChange?.(nextValue);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={handleChange}
        />

        {label && (
          <label
            className={cn(
              'text-sm cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            onClick={() => !disabled && handleChange(!checked)}
          >
            {label}
            {requiredAsterisk && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </label>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
