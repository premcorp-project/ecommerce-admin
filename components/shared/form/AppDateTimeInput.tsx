// AppDateTimeInput.tsx
'use client';

import * as React from 'react';
import { format } from 'date-fns';

import {
  FormikContext,
  type FormikContextType,
  type FormikValues,
} from 'formik';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  resolveFormikError,
  type ErrorStrategy,
} from '@/lib/resolveFormikError';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AppDateTimeInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'onChange'> {
  label?: string;
  className?: string;
  labelClassName?: string;
  inputContainerClassName?: string;
  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  requiredAsterisk?: boolean;
}

export const AppDateTimeInput = React.forwardRef<
  HTMLDivElement,
  AppDateTimeInputProps
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
      value: valueProp,
      onChange: onChangeProp,
      placeholder,
      disabled,
      requiredAsterisk,
      ...props
    },
    ref,
  ) => {
    const t = useTranslations('appDateTimeInput');
    const resolvedPlaceholder = placeholder ?? t('selectDateTime');
    const [open, setOpen] = React.useState(false);
    const [time, setTime] = React.useState({ hours: '12', minutes: '00' });
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

    const formik = React.useContext(
      FormikContext as unknown as React.Context<
        FormikContextType<FormikValues> | undefined
      >,
    );

    const hasFormik = Boolean(formik && name);

    // Get value from Formik or props
    const value = hasFormik && name ? formik!.values[name] : valueProp;

    // Parse date from ISO string - memoize to prevent changing on every render
    const date = React.useMemo(() => value ? new Date(value) : undefined, [value]);

    // Initialize currentMonth when date changes
    React.useEffect(() => {
      if (date && !isNaN(date.getTime())) {
        setCurrentMonth(new Date(date));
      }
    }, [date]);

    // Update time state when value changes
    React.useEffect(() => {
      if (date && !isNaN(date.getTime())) {
        setTime({
          hours: date.getHours().toString().padStart(2, '0'),
          minutes: date.getMinutes().toString().padStart(2, '0'),
        });
      }
    }, [date]);

    // Handle date selection
    const handleDateSelect = (selectedDate: Date | undefined) => {
      if (selectedDate) {
        // Combine selected date with current time
        const newDate = new Date(selectedDate);
        newDate.setHours(parseInt(time.hours), parseInt(time.minutes));

        const isoString = newDate.toISOString();

        if (hasFormik && name) {
          formik!.setFieldValue(name, isoString);
        }
        if (onChangeProp) {
          onChangeProp(isoString);
        }
      }
    };

    // Handle time change
    const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
      const newTime = { ...time, [type]: val };
      setTime(newTime);

      if (date) {
        const newDate = new Date(date);
        newDate.setHours(parseInt(newTime.hours), parseInt(newTime.minutes));

        const isoString = newDate.toISOString();

        if (hasFormik && name) {
          formik!.setFieldValue(name, isoString);
        }
        if (onChangeProp) {
          onChangeProp(isoString);
        }
      }
    };

    // Handle blur for Formik
    const handleBlur = () => {
      if (hasFormik && name) {
        formik!.setFieldTouched(name, true);
      }
    };

    // Navigation functions
    const goToPreviousYear = () => {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(newDate.getFullYear() - 1);
      setCurrentMonth(newDate);
    };

    const goToNextYear = () => {
      const newDate = new Date(currentMonth);
      newDate.setFullYear(newDate.getFullYear() + 1);
      setCurrentMonth(newDate);
    };

    const goToPreviousMonth = () => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentMonth(newDate);
    };

    const goToNextMonth = () => {
      const newDate = new Date(currentMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentMonth(newDate);
    };

    // Error: manual > Formik
    const formikError = resolveFormikError(
      formik,
      name as string | undefined,
      showErrorStrategy,
    );
    const error = errorProp ?? formikError;

    // a11y ids
    const generatedId = React.useId();
    const inputId = name ? `${name}-input` : generatedId;
    const helperId = error || helperText ? `${inputId}-helper` : undefined;

    // Format display value
    const displayValue = date ? format(date, 'dd MMM yyyy, hh:mm a') : '';

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-start gap-1.5', className)}
        {...props}
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

        <div className={cn('relative w-full', inputContainerClassName)}>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={inputId}
                variant="outline"
                disabled={disabled}
                onBlur={handleBlur}
                className={cn(
                  '!w-full h-11 rounded-[12px] bg-transparent text-sm font-normal border justify-start text-left',
                  '!pr-10',
                  !date && 'text-muted-foreground',
                  error
                    ? 'border-destructive focus:border-destructive'
                    : 'border-stroke focus:border-primary hover:border-primary',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
                aria-invalid={!!error}
                aria-describedby={helperId}
              >
                {displayValue || resolvedPlaceholder}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-1">
                {/* Year Navigation */}
                <div className="flex items-center justify-between mt-3 gap-2 px-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={goToPreviousYear}
                      disabled={disabled}
                      type="button"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={goToPreviousMonth}
                      disabled={disabled}
                      type="button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={goToNextMonth}
                      disabled={disabled}
                      type="button"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={goToNextYear}
                      disabled={disabled}
                      type="button"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Calendar
                  mode="single"
                  selected={date}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onSelect={handleDateSelect}
                  disabled={disabled}
                  className=" [&_.rdp-nav]:hidden [&_.rdp-caption]:hidden"
                  classNames={{
                    month_caption: 'hidden',
                    nav: 'hidden',
                  }}
                />
              </div>
              <div className="border-t p-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">{t('time')}</label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={time.hours}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        val === '' ||
                        (parseInt(val) >= 0 && parseInt(val) <= 23)
                      ) {
                        handleTimeChange('hours', val.padStart(2, '0'));
                      }
                    }}
                    className="w-16 h-9 text-center"
                    placeholder={t('hoursPlaceholder')}
                    disabled={disabled}
                  />
                  <span className="text-lg">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={time.minutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        val === '' ||
                        (parseInt(val) >= 0 && parseInt(val) <= 59)
                      ) {
                        handleTimeChange('minutes', val.padStart(2, '0'));
                      }
                    }}
                    className="w-16 h-9 text-center"
                    placeholder={t('minutesPlaceholder')}
                    disabled={disabled}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-primary/70">
            <CalendarIcon className="h-4 w-4" />
          </span>
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

AppDateTimeInput.displayName = 'AppDateTimeInput';
