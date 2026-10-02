'use client';

import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    resolveFormikError,
    type ErrorStrategy,
} from '@/lib/resolveFormikError';
import { cn } from '@/lib/utils';
import { Command as CommandPrimitive } from 'cmdk';
import {
    FormikContext,
    type FormikContextType,
    type FormikValues,
} from 'formik';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

type MultiSelectOption = string | { key: string; value: string };

interface MultiSelectProps {
  options: readonly MultiSelectOption[];
  selected?: string[];
  onChange?: (selected: string[]) => void;
  className?: string;
  name?: string;
  label?: string;
  labelClassName?: string;
  error?: string;
  helperText?: string;
  showErrorStrategy?: ErrorStrategy;
  placeholder?: string;
  id?: string;
  containerClassName?: string;
  inputContainerClassName?: string;
  disabled?: boolean;
  requiredAsterisk?: boolean;
}

export function MultiSelect({
  options,
  selected: selectedProp,
  onChange: onChangeProp,
  className,
  name,
  label,
  labelClassName,
  error: errorProp,
  helperText,
  showErrorStrategy = 'touchedOrSubmit',
  placeholder,
  id,
  containerClassName,
  inputContainerClassName,
  disabled,
  requiredAsterisk,
}: MultiSelectProps) {
  const t = useTranslations('appMultiSelect');
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [moreOptionsOpen, setMoreOptionsOpen] = React.useState(false);
  const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const commandRef = React.useRef<HTMLDivElement>(null);

  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  const hasFormik = Boolean(formik && name);

  const idToLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((opt) => {
      if (typeof opt === 'string') {
        map.set(opt, opt);
      } else {
        map.set(opt.value, opt.key);
      }
    });
    return map;
  }, [options]);

  let selected: string[];
  if (hasFormik && name) {
    const formikValue = formik!.values[name];
    selected = Array.isArray(formikValue) ? formikValue : [];
  } else {
    selected = selectedProp || [];
  }

  const onChange = (newSelected: string[]) => {
    if (hasFormik && name) {
      formik!.setFieldValue(name, newSelected);
    }
    if (onChangeProp) {
      onChangeProp(newSelected);
    }
  };

  const formikError = resolveFormikError(
    formik,
    name as string | undefined,
    showErrorStrategy,
  );
  const error = errorProp ?? formikError;

  const generatedId = React.useId();
  const inputId = name ? `${name}-multiselect-input` : generatedId;
  const helperId = error || helperText ? `${inputId}-helper` : undefined;

  const handleDeselect = (idToDeselect: string) => {
    onChange(selected.filter((s) => s !== idToDeselect));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return; // Prevent interaction when disabled
    const input = inputRef.current;
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '') {
          const newSelected = [...selected];
          newSelected.pop();
          onChange(newSelected);
        }
      }
      if (e.key === 'Escape') {
        input.blur();
      }
    }
  };

  const visibleSelected = selected.slice(0, 1);
  const hiddenSelectedCount = Math.max(0, selected.length - visibleSelected.length);

  const toggleSelection = (optionId: string) => {
    const isAlreadySelected = selected.includes(optionId);
    if (isAlreadySelected) {
      onChange(selected.filter((s) => s !== optionId));
      return;
    }
    onChange([...selected, optionId]);
  };

  return (
    <div ref={commandRef} className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-sm font-medium', labelClassName)}
        >
          {label}
          {requiredAsterisk && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <Command
        onKeyDown={handleKeyDown}
        className={cn('overflow-visible bg-transparent', className)}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              role="combobox"
              aria-controls="command-group"
              aria-expanded={open}
              className={cn(
                'group border px-1 pr-4 py-2.5 h-11 text-sm ring-offset-background rounded-[6px] relative',
                error
                  ? '!border-destructive focus-within:!border-destructive'
                  : open && !disabled
                    ? '!border-primary'
                    : '!border-input',
                inputContainerClassName,
                disabled && 'bg-light cursor-not-allowed opacity-70',
              )}
              onClick={() => !disabled && setOpen(!open)}
              id={id}
            >
              <div className="flex gap-1 flex-wrap">
                {visibleSelected.map((selectedId) => {
                  const displayLabel = idToLabelMap.get(selectedId) || selectedId;
                  return (
                    <Badge key={selectedId} variant="secondary">
                      {displayLabel}
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:!border-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDeselect(selectedId);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeselect(selectedId);
                        }}
                        disabled={disabled}
                      >
                        <span className="sr-only">{t('deselect')} {displayLabel}</span>
                        <svg
                          className="h-3 w-3 text-muted-foreground hover:text-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </Badge>
                  );
                })}
                {hiddenSelectedCount > 0 && (
                  <Popover
                    open={moreOptionsOpen}
                    onOpenChange={setMoreOptionsOpen}
                  >
                    <PopoverTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onMouseEnter={() => {
                          if (hoverTimeout.current) {
                            clearTimeout(hoverTimeout.current);
                          }
                          setMoreOptionsOpen(true);
                        }}
                        onMouseLeave={() => {
                          hoverTimeout.current = setTimeout(() => {
                            setMoreOptionsOpen(false);
                          }, 100);
                        }}
                      >
                        +{hiddenSelectedCount}
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0"
                      onMouseEnter={() => {
                        if (hoverTimeout.current) {
                          clearTimeout(hoverTimeout.current);
                        }
                        setMoreOptionsOpen(true);
                      }}
                      onMouseLeave={() => {
                        hoverTimeout.current = setTimeout(() => {
                          setMoreOptionsOpen(false);
                        }, 100);
                      }}
                    >
                      <Command>
                        <CommandGroup className=" overflow-y-auto">
                          {selected.slice(1).map((selectedId) => {
                            const displayLabel =
                              idToLabelMap.get(selectedId) || selectedId;
                            return (
                              <CommandItem
                                key={selectedId}
                                value={selectedId}
                                className="justify-between hover:bg-accent/80"
                              >
                                <span>{displayLabel}</span>
                                <button
                                  className="ml-1 ring-offset-background rounded-full outline-none focus:!border-primary"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeselect(selectedId);
                                  }}
                                >
                                  <span className="sr-only">
                                    {t('deselect')} {displayLabel}
                                  </span>
                                  <svg
                                    className="h-3 w-3 text-muted-foreground hover:!text-foreground"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <CommandPrimitive.Input
                  ref={inputRef}
                  id={inputId}
                  name={name}
                  value={inputValue}
                  onValueChange={setInputValue}
                  placeholder={placeholder ?? t('placeholder')}
                  className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
                  aria-invalid={!!error}
                  aria-describedby={helperId}
                  disabled={disabled}
                />
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronsUpDown
                  className={cn(
                    'h-4 w-4 opacity-50 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (
                commandRef.current?.contains(target) ||
                target.closest('[data-slot="popover-trigger"]')
              ) {
                e.preventDefault();
              }
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
          >
            <div
              className="max-h-[240px] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
              style={{ overflowY: 'auto', touchAction: 'pan-y' }}
              onMouseDown={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              <CommandGroup id="command-group">
                {options.length > 0 ? (
                  options.map((option) => {
                    const optionLabel =
                      typeof option === 'string' ? option : option.key;
                    const optionId =
                      typeof option === 'string' ? option : option.value;
                    const isSelected = selected.includes(optionId);
                    return (
                      <CommandItem
                        key={optionId}
                        value={`${optionLabel} ${optionId}`}
                        onSelect={() => {
                          setInputValue('');
                          toggleSelection(optionId);
                        }}
                        className="cursor-pointer hover:bg-accent/80 justify-between"
                      >
                        <span>{optionLabel}</span>
                        <Check
                          className={cn(
                            'h-4 w-4',
                            isSelected ? 'text-primary opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    );
                  })
                ) : (
                  <p className="p-2 text-center text-sm">{t('noMoreOptions')}</p>
                )}
              </CommandGroup>
            </div>
          </PopoverContent>
        </Popover>
      </Command>
      {(error || helperText) && (
        <p
          id={helperId}
          className={cn(
            'text-xs mt-1',
            error ? 'text-destructive' : 'text-mute',
          )}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}
