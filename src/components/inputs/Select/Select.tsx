import { forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { Field } from "../Field";
import { InputWrapper } from "../InputWrapper";
import { Portal } from "../../Portal";
import { useFloatingPosition } from "../../../hooks/use-floating-position";
import { useOutsideClick } from "../../../hooks/use-outside-click";
import { useEscapeKey } from "../../../hooks/use-escape-key";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
  resolveOption,
} from "../inputs.utils";
import type { InputOption, InputOptionGroup } from "../inputs.types";
import type { SelectProps } from "./Select.types";

function isOptionGroup(
  item: InputOption | InputOptionGroup,
): item is InputOptionGroup {
  return typeof item === "object" && "options" in item;
}

function flattenOptions(list: (InputOption | InputOptionGroup)[]): InputOption[] {
  const flat: InputOption[] = [];
  for (const item of list) {
    if (isOptionGroup(item)) {
      flat.push(...item.options);
    } else {
      flat.push(item);
    }
  }
  return flat;
}

function renderNativeOption(option: InputOption, index: number) {
  const resolved = resolveOption(option);
  return (
    <option
      key={`${resolved.value}-${index}`}
      value={resolved.value as string}
      disabled={resolved.disabled}
    >
      {resolved.label}
    </option>
  );
}

// ── Native variant ──────────────────────────────────────────────────────

const NativeSelect = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = "md",
      dirty,
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      list,
      placeholder,
      prefix,
      suffix,
      prefixPosition,
      suffixPosition,
      onValueChange,
      onChange,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const selectId = id ?? autoId;

    const select = (
      <InputWrapper
        prefix={prefix}
        suffix={suffix}
        prefixPosition={prefixPosition}
        suffixPosition={suffixPosition}
        size={size}
      >
        <select
          data-react-fancy-select=""
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          className={cn(
            inputBaseClasses,
            inputSizeClasses[size],
            dirtyClasses(dirty),
            errorClasses(error),
            "w-full appearance-none bg-no-repeat bg-[length:16px] bg-[right_8px_center]",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]",
            "pr-8",
            className,
          )}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {list.map((item, index) =>
            isOptionGroup(item) ? (
              <optgroup key={`group-${index}`} label={item.label}>
                {item.options.map((opt, optIndex) =>
                  renderNativeOption(opt, optIndex),
                )}
              </optgroup>
            ) : (
              renderNativeOption(item, index)
            ),
          )}
        </select>
      </InputWrapper>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={selectId}
          size={size}
        >
          {select}
        </Field>
      );
    }

    return select;
  },
);

NativeSelect.displayName = "NativeSelect";

// ── Listbox variant ─────────────────────────────────────────────────────

const ListboxSelect = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = "md",
      dirty,
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      list,
      placeholder = "Select...",
      multiple = false,
      values: controlledValues,
      defaultValues,
      onValueChange,
      onValuesChange,
      searchable = false,
      selectedSuffix = "selected",
      indicator = "check",
      value: controlledSingleValue,
      defaultValue: defaultSingleValue,
    },
    _ref,
  ) => {
    const autoId = useId();
    const selectId = id ?? autoId;

    // ── State ──────────────────────────────────────────────
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);

    // Single-select state
    const [singleValue, setSingleValue] = useState<string>(
      (controlledSingleValue as string) ?? (defaultSingleValue as string) ?? "",
    );
    const currentSingle = (controlledSingleValue as string) ?? singleValue;

    // Multi-select state
    const [multiValues, setMultiValues] = useState<string[]>(
      controlledValues ?? defaultValues ?? [],
    );
    const currentMulti = controlledValues ?? multiValues;

    // Sync controlled values
    useEffect(() => {
      if (controlledValues) setMultiValues(controlledValues);
    }, [controlledValues]);
    useEffect(() => {
      if (controlledSingleValue !== undefined) setSingleValue(controlledSingleValue as string);
    }, [controlledSingleValue]);

    // ── Refs ───────────────────────────────────────────────
    const anchorRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const position = useFloatingPosition(anchorRef, listRef, {
      placement: "bottom-start",
      offset: 4,
      enabled: open,
    });

    const close = useCallback(() => {
      setOpen(false);
      setSearch("");
      setActiveIndex(-1);
    }, []);

    useOutsideClick(wrapperRef, close, open);
    useEscapeKey(close, open);

    // Focus search on open
    useEffect(() => {
      if (open && searchable) {
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }, [open, searchable]);

    // ── Options ────────────────────────────────────────────
    const allOptions = flattenOptions(list);
    const resolvedOptions = allOptions.map(resolveOption);

    const filtered = search
      ? resolvedOptions.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : resolvedOptions;

    // ── Selection ──────────────────────────────────────────
    const isSelected = (value: string): boolean => {
      if (multiple) return currentMulti.includes(value);
      return currentSingle === value;
    };

    const toggleOption = useCallback(
      (value: string) => {
        if (multiple) {
          const next = currentMulti.includes(value)
            ? currentMulti.filter((v) => v !== value)
            : [...currentMulti, value];
          setMultiValues(next);
          onValuesChange?.(next);
        } else {
          setSingleValue(value);
          onValueChange?.(value);
          close();
        }
      },
      [multiple, currentMulti, onValuesChange, onValueChange, close],
    );

    // ── Display text ───────────────────────────────────────
    const getDisplayText = (): string => {
      if (multiple) {
        if (currentMulti.length === 0) return placeholder;
        if (currentMulti.length === 1) {
          const opt = resolvedOptions.find((o) => o.value === currentMulti[0]);
          return opt?.label ?? currentMulti[0];
        }
        return `${currentMulti.length} ${selectedSuffix}`;
      }
      if (!currentSingle) return placeholder;
      const opt = resolvedOptions.find((o) => o.value === currentSingle);
      return opt?.label ?? currentSingle;
    };

    const hasValue = multiple ? currentMulti.length > 0 : !!currentSingle;

    // ── Keyboard ───────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item && !item.disabled) toggleOption(item.value as string);
      }
    };

    // ── Render ─────────────────────────────────────────────
    const trigger = (
      <button
        ref={anchorRef}
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-react-fancy-select=""
        data-variant="listbox"
        className={cn(
          inputBaseClasses,
          inputSizeClasses[size],
          dirtyClasses(dirty),
          errorClasses(error),
          "flex w-full cursor-pointer items-center justify-between gap-2 text-left",
          !hasValue && "text-zinc-400 dark:text-zinc-500",
          className,
        )}
      >
        <span className="truncate">{getDisplayText()}</span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    );

    const dropdown = open && (
      <Portal>
        <div
          ref={listRef}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className="fixed z-50 max-h-60 min-w-[8rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-zinc-950/50 fancy-scale-in"
          style={{
            left: position.x,
            top: position.y,
            width: anchorRef.current?.offsetWidth,
          }}
        >
          {searchable && (
            <div className="px-2 pb-1">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full rounded-md border-0 bg-zinc-100 px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-400">No results found</div>
          ) : (
            filtered.map((option, i) => {
              const selected = isSelected(option.value as string);
              return (
                <button
                  key={option.value as string}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => toggleOption(option.value as string)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === activeIndex
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                    selected
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-700 dark:text-zinc-300",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  {/* Indicator */}
                  {indicator === "checkbox" ? (
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        selected
                          ? "border-blue-500 bg-blue-500 text-white dark:border-blue-400 dark:bg-blue-400"
                          : "border-zinc-300 dark:border-zinc-600",
                      )}
                    >
                      {selected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2.5 6 5 8.5 9.5 3.5" />
                        </svg>
                      )}
                    </span>
                  ) : (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {selected && (
                        <svg className="h-4 w-4 text-blue-500 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}

                  {/* Label + description */}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">{option.description}</span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </Portal>
    );

    const content = (
      <div ref={wrapperRef} className="relative">
        {trigger}
        {dropdown}
      </div>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={selectId}
          size={size}
        >
          {content}
        </Field>
      );
    }

    return content;
  },
);

ListboxSelect.displayName = "ListboxSelect";

// ── Public component ────────────────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (props, ref) => {
    const variant = props.variant ?? (props.multiple ? "listbox" : "native");

    if (variant === "listbox") {
      return <ListboxSelect {...props} ref={ref} />;
    }
    return <NativeSelect {...props} ref={ref} />;
  },
);

Select.displayName = "Select";
