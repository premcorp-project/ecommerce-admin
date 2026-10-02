'use client';

import Status from '@/components/shared/Status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ChevronsUpDown, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

export interface UserOption {
  id: string;
  name: string;
  email: string;
  image?: string;
  status?: 'active' | 'deactivated' | 'blocked';
}

interface AppUserSelectProps {
  options: UserOption[];
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
  maxAvatarsDisplay?: number;
  onInviteUser?: () => void;
  onSearchChange?: (search: string) => void;
  onLoadMore?: () => void;
  isLoading?: boolean;
  isFetchingMore?: boolean;
  showLoadingOption?: boolean;
  hasMore?: boolean;
}

export function AppUserSelect({
  options,
  selected: selectedProp,
  onChange: onChangeProp,
  onSearchChange,
  onLoadMore,
  isLoading = false,
  isFetchingMore = false,
  showLoadingOption = false,
  hasMore = true,
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
  maxAvatarsDisplay = 6,
}: AppUserSelectProps) {
  const t = useTranslations('appUserSelect');
  const resolvedPlaceholder = placeholder ?? t('selectUsers');
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Focus input when dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const formik = React.useContext(
    FormikContext as unknown as React.Context<
      FormikContextType<FormikValues> | undefined
    >,
  );

  const hasFormik = Boolean(formik && name);

  // Create a map for quick user lookup
  const userMap = React.useMemo(() => {
    const map = new Map<string, UserOption>();
    options.forEach((user) => {
      map.set(user.id, user);
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
  const inputId = name ? `${name}-userselect-input` : generatedId;
  const helperId = error || helperText ? `${inputId}-helper` : undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
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

  // Filter users based on search input (by name or email) - show all users, not filtering by selected
  const filteredOptions = React.useMemo(() => {
    const searchLower = inputValue.toLowerCase();
    if (!inputValue) return options;
    return options.filter((user) => {
      return (
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    });
  }, [options, inputValue]);

  const handleToggleUser = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const selectedUsers = selected
    .map((id) => userMap.get(id))
    .filter(Boolean) as UserOption[];

  return (
    <TooltipProvider>
      <div
        ref={commandRef}
        className={cn('flex flex-col gap-1.5', containerClassName)}
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
            <div
              role="combobox"
              aria-controls="command-container"
              aria-expanded={open}
              onKeyDown={handleKeyDown}
              className={cn(
                'group border px-3 flex items-center h-11 text-sm ring-offset-background rounded-[12px] relative',
                error
                  ? '!border-destructive focus-within:!border-destructive'
                  : open && !disabled
                    ? '!border-primary'
                    : '!border-stroke',
                inputContainerClassName,
                disabled && 'bg-light cursor-not-allowed opacity-70',
              )}
              onClick={() => !disabled && setOpen(!open)}
              id={id}
            >
              <div className="flex gap-2 items-center">
                {/* Show avatars for selected users */}
                {selectedUsers.length > 0 ? (
                  <div className="flex items-center -space-x-2">
                    {selectedUsers.slice(0, maxAvatarsDisplay).map((user) => (
                      <Tooltip key={user.id} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <Avatar className="size-8 border border-primary hover:z-10 transition-all cursor-pointer">
                            {user.image && (
                              <AvatarImage
                                src={user.image}
                                alt={user.name}
                                className="bg-background"
                              />
                            )}
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{user.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {selectedUsers.length > maxAvatarsDisplay && (
                      <Avatar className="size-8 border-2 border-background bg-accent">
                        <AvatarFallback className="text-xs font-medium">
                          +{selectedUsers.length - maxAvatarsDisplay}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ) : null}
                <span className="text-sm text-muted-foreground flex-1">
                  {selectedUsers.length > 0
                    ? t('selectedCount', { count: selectedUsers.length })
                    : resolvedPlaceholder}
                </span>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              // Focus search input when popover opens
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
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
            <Command
              ref={commandRef}
              className={cn('overflow-visible bg-transparent', className)}
              shouldFilter={false}
            >
              {/* Search Input */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <CommandPrimitive.Input
                    ref={inputRef}
                    id={inputId}
                    name={name}
                    value={inputValue}
                    onValueChange={(value) => {
                      setInputValue(value);
                      onSearchChange?.(value);
                    }}
                    placeholder={t('searchUsers')}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-stroke bg-transparent text-sm outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
                    aria-invalid={!!error}
                    aria-describedby={helperId}
                    disabled={disabled || isLoading}
                  />
                </div>
              </div>

              {/* Scrollable User List */}
              <div
                className="max-h-[280px] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
                style={{ overflowY: 'auto', touchAction: 'pan-y' }}
                onMouseDown={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  e.stopPropagation();
                }}
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const bottom =
                    target.scrollHeight - target.scrollTop <=
                    target.clientHeight + 50;
                  if (bottom && onLoadMore && !isFetchingMore && hasMore) {
                    onLoadMore();
                  }
                }}
              >
                <CommandGroup>
                  {isLoading ? (
                    <CommandItem disabled>
                      <div className="w-full py-4 text-center text-sm text-muted-foreground">
                        {t('loading')}
                      </div>
                    </CommandItem>
                  ) : filteredOptions.length > 0 ? (
                    <>
                      {filteredOptions.map((user) => {
                        const isSelected = selected.includes(user.id);
                        const isDisabled =
                          user.status === 'deactivated' ||
                          user.status === 'blocked';
                        return (
                          <CommandItem
                            key={user.id}
                            value={`${user.name} ${user.email}`}
                            onSelect={() => {
                              if (isDisabled) return;
                              onSearchChange?.('');
                              handleToggleUser(user.id);
                            }}
                            disabled={isDisabled}
                            className={cn(
                              'px-3 py-2.5',
                              isDisabled
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer hover:bg-accent/80',
                            )}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Checkbox
                                checked={isSelected}
                                disabled={isDisabled}
                                onCheckedChange={() => {
                                  if (isDisabled) return;
                                  onSearchChange?.('');
                                  handleToggleUser(user.id);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              />
                              <Avatar className="size-9 bg-accent">
                                {user.image && (
                                  <AvatarImage
                                    src={user.image}
                                    alt={user.name}
                                  />
                                )}
                                <AvatarFallback className="text-xs bg-accent">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              {isDisabled && user.status && (
                                <Status status={user.status} />
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                      {isFetchingMore && showLoadingOption && (
                        <CommandItem disabled>
                          <div className="w-full py-2 text-center text-sm text-muted-foreground">
                            Loading more...
                          </div>
                        </CommandItem>
                      )}
                      {!hasMore && !isFetchingMore && (
                        <CommandItem disabled>
                          <div className="w-full py-2 text-center text-sm text-muted-foreground">
                            You have reached the end of the list
                          </div>
                        </CommandItem>
                      )}
                    </>
                  ) : (
                    <CommandItem disabled>
                      <div className="p-4 flex flex-col items-center gap-3">
                        <p className="text-sm text-muted-foreground text-center">
                          No options available
                        </p>
                      </div>
                    </CommandItem>
                  )}
                </CommandGroup>
              </div>
            </Command>
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
    </TooltipProvider>
  );
}
