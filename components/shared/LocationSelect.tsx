'use client';

/**
 * LocationSelect — searchable dropdown for country/city selection.
 *
 * Uses a simple filtered list approach (no heavy combobox library).
 * Renders as a native-feeling dropdown with search input.
 *
 * Props:
 *  - options: { label, value }[]
 *  - value: current selected value
 *  - onChange: callback with new value
 *  - placeholder: input placeholder
 *  - disabled: disable the select
 *  - error: show error border
 */

import { cn } from '@/lib/utils';
import { ChevronDown, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface SelectOption {
    label: string;
    value: string;
}

interface LocationSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    id?: string;
    name?: string;
}

export function LocationSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    error = false,
    id,
    name,
}: LocationSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find the selected option's label
    const selectedLabel = useMemo(
        () => options.find((o) => o.value === value)?.label ?? '',
        [options, value],
    );

    // Filter options by search
    const filtered = useMemo(() => {
        if (!search.trim()) return options.slice(0, 200); // Limit initial render
        const q = search.toLowerCase();
        return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 100);
    }, [options, search]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus search input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const handleSelect = useCallback(
        (val: string) => {
            onChange(val);
            setOpen(false);
            setSearch('');
        },
        [onChange],
    );

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => !disabled && setOpen(!open)}
                className={cn(
                    'flex w-full items-center justify-between rounded-md border bg-background px-3 py-2',
                    'text-sm min-h-[44px] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    error ? 'border-destructive' : 'border-input',
                    disabled && 'opacity-50 cursor-not-allowed',
                    !value && 'text-muted-foreground',
                )}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span className="truncate">{selectedLabel || placeholder}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {value && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-muted"
                        >
                            <X className="size-3 text-muted-foreground" />
                        </span>
                    )}
                    <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                    {/* Search input */}
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                        <Search className="size-4 text-muted-foreground shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        />
                    </div>

                    {/* Options list */}
                    <ul
                        role="listbox"
                        className="max-h-48 overflow-y-auto py-1"
                    >
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-muted-foreground text-center">
                                No results found
                            </li>
                        ) : (
                            filtered.map((option) => (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={option.value === value}
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'px-3 py-2 text-sm cursor-pointer transition-colors',
                                        option.value === value
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'text-foreground hover:bg-muted',
                                    )}
                                >
                                    {option.label}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            {/* Hidden input for form submission */}
            {name && <input type="hidden" name={name} value={value} />}
        </div>
    );
}

export default LocationSelect;
