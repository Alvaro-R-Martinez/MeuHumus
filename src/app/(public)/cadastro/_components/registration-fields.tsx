'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ComponentPropsWithoutRef, ReactNode } from 'react';

type FeedbackIntent = 'info' | 'error' | 'warning' | 'success';

type InputBaseProps = Pick<ComponentPropsWithoutRef<'input'>, 'type' | 'placeholder' | 'min' | 'step' | 'inputMode'>;
type TextAreaBaseProps = Pick<ComponentPropsWithoutRef<'textarea'>, 'placeholder' | 'rows'>;

export type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
} & InputBaseProps;

export type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
} & TextAreaBaseProps;

export function TextField({
  label,
  value,
  onChange,
  error,
  helperText,
  type = 'text',
  placeholder,
  min,
  step,
  inputMode,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1 text-sm text-[var(--muted)]">
      <label className="block" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="w-full rounded-md border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        step={step}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
      />
      {error && (
        <span id={errorId} role="alert" className="block text-xs text-rose-400">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="block text-xs text-[var(--muted)]">{helperText}</span>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  placeholder,
  rows = 4,
}: TextAreaFieldProps) {
  const textareaId = useId();
  const errorId = `${textareaId}-error`;

  return (
    <div className="space-y-1 text-sm text-[var(--muted)]">
      <label className="block" htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className="w-full rounded-md border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        value={value}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.currentTarget.value)}
      />
      {error && (
        <span id={errorId} role="alert" className="block text-xs text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--border) 82%,black 18%)] bg-[color-mix(in_srgb,var(--surface) 92%,black 8%)] p-4 shadow-inner shadow-black/20 sm:p-6">
      {children}
    </div>
  );
}

type AutocompleteProps<T> = {
  label: string;
  value: T | '';
  options: readonly T[];
  onChange: (value: T | '') => void;
  error?: string;
  helperText?: string;
} & Pick<ComponentPropsWithoutRef<'input'>, 'placeholder' | 'disabled'>;

export function AutocompleteField<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  helperText,
  placeholder,
  disabled,
}: AutocompleteProps<T>) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const listId = `${inputId}-list`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<string>(value);
  const [filteredOptions, setFilteredOptions] = useState<readonly T[]>(options);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleInputChange = (inputValue: string) => {
    setQuery(inputValue);
    setSelectedIndex(-1);

    const normalizedQuery = inputValue.toLowerCase().trim();
    if (!normalizedQuery) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(normalizedQuery)
      );
      setFilteredOptions(filtered);
    }

    setShowOptions(true);
  };

  const handleOptionSelect = (option: T) => {
    setQuery(option);
    onChange(option);
    setShowOptions(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setShowOptions(true);
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.toLowerCase().includes(normalizedQuery)
      );
      setFilteredOptions(filtered);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on option
    setTimeout(() => setShowOptions(false), 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!showOptions || filteredOptions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowOptions(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="space-y-1 text-sm text-[var(--muted)]">
      <label className="block" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          className="w-full rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface) 94%,black 6%)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent) 18%,black 82%)] disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--border) 90%,black 10%)] disabled:bg-[color-mix(in_srgb,var(--surface) 95%,black 5%)]"
          value={query}
          onChange={(event) => handleInputChange(event.currentTarget.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-expanded={showOptions}
          aria-haspopup="listbox"
          aria-activedescendant={selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
          role="combobox"
        />
        {showOptions && filteredOptions.length > 0 && (
          <ul
            id={listId}
            className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border)] bg-white shadow-lg shadow-black/25"
            role="listbox"
          >
            {filteredOptions.map((option, index) => (
              <li
                key={option}
                id={`${listId}-${index}`}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-[color-mix(in_srgb,var(--accent) 18%,black 82%)] text-[var(--foreground)]'
                    : 'text-[var(--color-trufa)]'
                }`}
                onClick={() => handleOptionSelect(option)}
                role="option"
                aria-selected={index === selectedIndex}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <span id={errorId} role="alert" className="block text-xs text-rose-400">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="block text-xs text-[var(--muted)]">{helperText}</span>
      )}
    </div>
  );
}

export function FeedbackBanner({ intent, children }: { intent: FeedbackIntent; children: ReactNode }) {
  const palette: Record<FeedbackIntent, string> = {
    info: 'border-[color-mix(in_srgb,var(--accent) 50%,white 50%)] bg-[color-mix(in_srgb,var(--accent) 18%,black 82%)] text-[var(--foreground)]',
    error: 'border-rose-500/60 bg-rose-900/40 text-rose-200',
    warning: 'border-amber-400/70 bg-amber-900/40 text-amber-100',
    success: 'border-emerald-500/60 bg-emerald-900/40 text-emerald-100',
  } as const;

  const role = intent === 'error' ? 'alert' : 'status';
  const ariaLive = intent === 'error' ? 'assertive' : 'polite';

  return (
    <div suppressHydrationWarning role={role} aria-live={ariaLive} className={`rounded-xl border px-4 py-3 text-sm ${palette[intent]}`}>
      {children}
    </div>
  );
}
