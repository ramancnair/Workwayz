'use client';

import * as React from 'react';
import { Search, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';

export interface ThemedAutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface ThemedAutocompleteProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  options: ThemedAutocompleteOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  emptyText?: string;
  icon?: React.ReactNode;
  allowClear?: boolean;
  id?: string;
}

export function ThemedAutocomplete({
  value,
  onChange,
  options = [],
  placeholder = 'Search...',
  className,
  disabled = false,
  emptyText = 'No options found.',
  icon,
  allowClear = true,
  id,
}: ThemedAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputText, setInputText] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Sync inputText with incoming value
  React.useEffect(() => {
    if (value) {
      const matching = options.find((opt) => opt.value === value);
      if (matching) {
        setInputText(matching.label);
      } else {
        setInputText('');
      }
    } else {
      setInputText('');
    }
  }, [value, options]);

  // Check if current text is the exact label of the selected option
  const isSelectedExactMatch = React.useMemo(() => {
    if (!value) return false;
    const currentSelected = options.find((opt) => opt.value === value);
    return Boolean(currentSelected && currentSelected.label.trim().toLowerCase() === inputText.trim().toLowerCase());
  }, [value, options, inputText]);

  // Filter options based on user typing
  const filteredOptions = React.useMemo(() => {
    const q = inputText.trim().toLowerCase();
    // If empty or text matches current selection exactly, show all options
    if (!q || isSelectedExactMatch) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [inputText, options, isSelectedExactMatch]);

  // Set highlighted index when filtered list changes or selection is present
  React.useEffect(() => {
    if (value) {
      const idx = filteredOptions.findIndex((opt) => opt.value === value);
      if (idx !== -1) {
        setHighlightedIndex(idx);
        return;
      }
    }
    setHighlightedIndex(0);
  }, [filteredOptions, value]);

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLDivElement>('[data-option-index]');
    const target = items[highlightedIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = React.useCallback(
    (option: ThemedAutocompleteOption) => {
      setInputText(option.label);
      onChange?.(option.value);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setInputText('');
      onChange?.(undefined);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    const trimmed = inputText.trim().toLowerCase();
    const matching = options.find((opt) => opt.label.toLowerCase() === trimmed);
    if (matching) {
      setInputText(matching.label);
      onChange?.(matching.value);
    } else if (!trimmed || trimmed === 'unassigned') {
      setInputText('');
      onChange?.(undefined);
    } else {
      // Revert to existing value if text didn't match anything
      const currentSelected = options.find((opt) => opt.value === value);
      if (currentSelected) {
        setInputText(currentSelected.label);
      } else {
        setInputText('');
        onChange?.(undefined);
      }
    }
  }, [inputText, options, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      handleClose();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10 flex items-center">
              {icon !== undefined ? icon : <Search className="h-4 w-4" />}
            </div>
            <Input
              ref={inputRef}
              id={id}
              type="text"
              autoComplete="off"
              disabled={disabled}
              value={inputText}
              placeholder={placeholder}
              onChange={(e) => {
                setInputText(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => {
                if (!disabled) {
                  setIsOpen(true);
                  inputRef.current?.select();
                }
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'pl-9 pr-8 transition-colors',
                className
              )}
            />
            {allowClear && !!inputText && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors focus:outline-none"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          style={{
            width: 'var(--radix-popover-anchor-width, var(--radix-popover-trigger-width))',
          }}
          className="min-w-[240px] p-1 z-50 max-h-60 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div ref={listRef} className="space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = highlightedIndex === index;
                return (
                  <div
                    key={opt.value}
                    data-option-index={index}
                    onMouseDown={(e) => {
                      // Prevent input blur before click registers
                      e.preventDefault();
                    }}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2.5 py-2 text-sm transition-colors outline-none',
                      isHighlighted
                        ? 'bg-accent text-accent-foreground'
                        : 'text-popover-foreground hover:bg-accent/60',
                      isSelected && 'font-medium'
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-xs text-muted-foreground truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
