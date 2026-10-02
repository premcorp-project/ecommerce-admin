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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Color presets organized by category
const COLOR_PRESETS = {
  basic: [
    '#000000',
    '#FFFFFF',
    '#808080',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
  ],
  blue: [
    '#E3F2FD',
    '#BBDEFB',
    '#90CAF9',
    '#64B5F6',
    '#42A5F5',
    '#2196F3',
    '#1E88E5',
    '#1976D2',
    '#1565C0',
    '#0D47A1',
  ],
  green: [
    '#E8F5E9',
    '#C8E6C9',
    '#A5D6A7',
    '#81C784',
    '#66BB6A',
    '#43A047',
    '#388E3C',
    '#2E7D32',
    '#1B5E20',
    '#0D3E0A',
  ],
  red: [
    '#FFEBEE',
    '#FFCDD2',
    '#EF9A9A',
    '#E57373',
    '#EF5350',
    '#F44336',
    '#E53935',
    '#D32F2F',
    '#C62828',
    '#B71C1C',
  ],
  orange: [
    '#FBE9E7',
    '#FFCCBC',
    '#FFAB91',
    '#FF8A65',
    '#FF7043',
    '#F4511E',
    '#E64A19',
    '#D84315',
    '#BF360C',
    '#A1887F',
  ],
  purple: [
    '#F3E5F5',
    '#E1BEE7',
    '#CE93D8',
    '#BA68C8',
    '#AB47BC',
    '#9C27B0',
    '#8E24AA',
    '#7B1FA2',
    '#6A1B9A',
    '#4A148C',
  ],
  teal: [
    '#E0F2F1',
    '#B2DFDB',
    '#80DEEA',
    '#4DD0E1',
    '#26C6DA',
    '#00BCD4',
    '#00ACC1',
    '#0097A7',
    '#00838F',
    '#006064',
  ],
};

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'prefix'
>;

interface AppColorInputProps extends NativeInputProps {
  label?: string;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;

  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  requiredAsterisk?: boolean;

  /** Enable color presets (default: true) */
  showPresets?: boolean;
}

export const AppColorInput = React.forwardRef<
  HTMLInputElement,
  AppColorInputProps
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
      showPresets = true,
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
    type FieldProps = {
      value?: string;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    };
    const fieldProps = hasFormik
      ? (formik!.getFieldProps(name as string) as FieldProps)
      : ({} as FieldProps);

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

    const [open, setOpen] = React.useState(false);
    const initialValue = hasFormik
      ? (fieldProps.value as string) || '#000000'
      : (props.value as string) || '#000000';
    const [colorInput, setColorInput] = React.useState(initialValue);

    // Memoize current value for useEffect dependency
    const currentValue = React.useMemo(
      () => hasFormik ? (fieldProps.value as string) : (props.value as string),
      [hasFormik, fieldProps.value, props.value],
    );

    React.useEffect(() => {
      if (currentValue) {
        setColorInput(currentValue || '#000000');
      }
    }, [currentValue]);

    const handleColorChange = (newValue: string) => {
      setColorInput(newValue);
      if (formik && name) {
        formik.setFieldValue(name, newValue);
      }
    };

    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const isValidColor = hexColorRegex.test(colorInput);

    return (
      <div
        className={cn('flex flex-col items-start gap-1.5', containerClassName)}
      >
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative w-full">
              {/* Text Input with Color Preview Inside */}
              <div className="relative">
                <Input
                  ref={ref}
                  id={inputId}
                  name={name}
                  type="text"
                  value={colorInput}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setColorInput(newValue);
                    handleColorChange(newValue);
                    if (fieldProps.onChange) {
                      fieldProps.onChange(e);
                    }
                  }}
                  placeholder="#000000"
                  className={cn(
                    '!h-10 w-full rounded-lg pl-10 focus-visible:ring-0',
                    error
                      ? 'border-destructive focus:border-destructive'
                      : 'border-stroke focus:border-primary focus-visible:border-primary focus-within:border-primary ',
                    className,
                  )}
                  aria-invalid={!!error}
                  aria-describedby={helperId}
                  {...props}
                />

                {/* Color Preview Swatch Inside Input */}
                <div
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md border-2 shadow-sm cursor-pointer hover:scale-110 transition-all"
                  style={{
                    backgroundColor: isValidColor ? colorInput : '#000000',
                    borderColor: error
                      ? 'hsl(var(--destructive))'
                      : 'rgba(255,255,255,0.5)',
                  }}
                  title={isValidColor ? colorInput : 'Invalid color'}
                />
              </div>
            </div>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-4" align="start" sideOffset={8}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Color Picker</p>
                <div
                  className="h-8 w-8 rounded-md border-2 shadow-sm"
                  style={{
                    backgroundColor: isValidColor ? colorInput : '#000000',
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}
                />
              </div>

              {/* Large Native Color Picker */}
              <div className="flex justify-center ">
                <input
                  type="color"
                  value={isValidColor ? colorInput : '#000000'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full h-20 p-0 m-0 cursor-pointer border rounded-md focus-visible:ring-0 "
                  // style={{ borderColor: 'hsl(var(--border))' }}
                />
              </div>

              {/* Preset Colors by Category */}
              {showPresets && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(COLOR_PRESETS).map(([category, colors]) => (
                    <div key={category} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {category}
                      </p>
                      <div className="grid grid-cols-9 gap-1.5">
                        {colors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleColorChange(color)}
                            className="h-6 w-6 rounded-md border-2 hover:scale-125 hover:z-10 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                            style={{
                              backgroundColor: color,
                              borderColor: 'rgba(255,255,255,0.2)',
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Value Display */}
              <div className="flex items-center justify-between pt-2 border-t border-stroke">
                <span className="text-xs text-muted-foreground">Selected:</span>
                <code className="text-xs font-mono font-semibold">
                  {colorInput.toUpperCase()}
                </code>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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

AppColorInput.displayName = 'AppColorInput';
