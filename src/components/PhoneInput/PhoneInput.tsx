import { forwardRef, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../../utils/cn";
import { isImeComposing } from "../../utils/ime";
import { directionOf, type Direction } from "../../utils/direction";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { Portal } from "../Portal";
import { Input } from "../inputs/Input";
import { errorClasses, inputBaseClasses } from "../inputs/inputs.utils";
import {
  PHONE_COUNTRIES,
  findCountry,
  flagOf,
  foldForSearch,
  nationalNumberOf,
  parsePhone,
} from "./phone";
import type {
  PhoneCountry,
  PhoneInputDetail,
  PhoneInputMessages,
  PhoneInputProps,
  PhoneInputReason,
} from "./PhoneInput.types";

const DEFAULT_MESSAGES: Required<PhoneInputMessages> = {
  too_short: "This number is too short for {country}.",
  too_long: "This number is too long for {country}.",
  invalid_chars: "Use digits only. Spaces, dashes, brackets and a leading + are fine.",
  unknown_country: "Choose a country, or start the number with + and its country code.",
  country: "Country",
  chooseCountry: "Choose a country",
  search: "Search countries",
  noResults: "No matching countries",
};

/** Messages that cannot be fixed by typing more are shown at once; the rest on blur. */
const IMMEDIATE: ReadonlySet<PhoneInputReason> = new Set(["invalid_chars", "too_long"]);

function fill(template: string, country: string): string {
  return template.split("{country}").join(country);
}

function regionNamer(locale: string | undefined): (code: string) => string {
  try {
    const names = new Intl.DisplayNames(locale ? [locale] : undefined, { type: "region" });
    return (code) => {
      try {
        return names.of(code) ?? code;
      } catch {
        return code;
      }
    };
  } catch {
    return (code) => code;
  }
}

interface Listed extends PhoneCountry {
  name: string;
  folded: string;
}

function rank(c: Listed, query: string, dialQuery: string | null): number {
  if (c.code.toLowerCase() === query) return 0;
  if (dialQuery !== null && c.dialCode === dialQuery) return 1;
  if (c.folded.startsWith(query)) return 2;
  return 3;
}

function matches(c: Listed, query: string, dialQuery: string | null): boolean {
  if (dialQuery !== null) return dialQuery.length > 0 && c.dialCode.startsWith(dialQuery);
  return c.folded.includes(query) || c.code.toLowerCase() === query;
}

/** "+95", "0095" and "95" are dial-code searches; anything else searches names. */
function dialQueryOf(query: string): string | null {
  let rest = query;
  if (rest.startsWith("+")) rest = rest.slice(1);
  else if (rest.startsWith("00")) rest = rest.slice(2);
  if (rest.length === 0) return query.startsWith("+") ? "" : null;
  for (const ch of rest) {
    if (ch < "0" || ch > "9") return null;
  }
  return rest;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    value,
    defaultValue = null,
    onValueChange,
    defaultCountry,
    countries,
    locale,
    label,
    description,
    error,
    required,
    disabled,
    name,
    form,
    id,
    placeholder,
    autoFocus,
    className,
    messages,
    onBlur,
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-number`;
  const labelId = `${inputId}-label`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const listId = `${inputId}-countries`;
  const msg = { ...DEFAULT_MESSAGES, ...messages };

  const [held, setValue] = useControllableState<string | null>(value, defaultValue);
  const current = typeof held === "string" && held !== "" ? held : null;
  const options = useMemo(() => ({ countries }), [countries]);

  const [country, setCountry] = useState<string | null>(() => {
    const fromValue = nationalNumberOf(current, { ...options, country: defaultCountry }).country;
    return fromValue ?? (defaultCountry ? defaultCountry.toUpperCase() : null);
  });

  /*
   * The text is held apart from the value, as in NumberField: "+95 9" has no
   * E.164 that displays it. It only moves on its own when the value moved to
   * something the text does not say: a change from outside, or a parent
   * refusing this one. Then it shows the national number, and the picker the
   * country, because the dial code is already on the picker.
   */
  const [text, setText] = useState(() => nationalNumberOf(current, { ...options, country }).nationalNumber);
  const parsed = parsePhone(text, { ...options, country });
  if (parsed.value !== current) {
    const target = nationalNumberOf(current, { ...options, country });
    const nextCountry = target.country ?? country;
    if (text !== target.nationalNumber || nextCountry !== country) {
      setText(target.nationalNumber);
      setCountry(nextCountry);
    }
  }

  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef<string | null>(null);

  const names = useMemo(() => regionNamer(locale), [locale]);
  const listed = useMemo<Listed[]>(() => {
    const rows = countries
      ? countries.map((c) => findCountry(c)).filter((c): c is PhoneCountry => c !== undefined)
      : [...PHONE_COUNTRIES];
    const out = rows.map((c) => {
      const n = names(c.code);
      return { ...c, name: n, folded: foldForSearch(n) };
    });
    if (!countries) {
      let collator: Intl.Collator;
      try {
        collator = new Intl.Collator(locale);
      } catch {
        collator = new Intl.Collator();
      }
      out.sort((a, b) => collator.compare(a.name, b.name));
    }
    return out;
  }, [countries, names, locale]);

  const selected = findCountry(parsed.country ?? country);
  const selectedName = selected ? names(selected.code) : "";

  const emit = (nextText: string, nextCountry: string | null) => {
    const p = parsePhone(nextText, { ...options, country: nextCountry });
    setText(nextText);
    setCountry(p.country ?? nextCountry);

    const detail: PhoneInputDetail = {
      country: p.country,
      dialCode: p.dialCode,
      nationalNumber: p.nationalNumber,
      valid: p.valid,
      reason: p.reason,
      approximate: p.approximate,
    };
    const key = JSON.stringify([p.value, detail]);
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;
    if (p.value !== current) setValue(p.value);
    onValueChange?.(p.value, detail);
  };

  // ── Validation message ────────────────────────────────────
  const reason = parsed.reason;
  const reasonMessage = reason ? fill(msg[reason], selectedName || "this country") : "";
  const shown = error ?? (reason && (IMMEDIATE.has(reason) || touched) ? reasonMessage : undefined);
  const describedBy = [description ? descriptionId : null, shown ? errorId : null]
    .filter(Boolean)
    .join(" ");

  // A form learns of it through native validity, as with NumberField.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.setCustomValidity(reasonMessage);
  });

  // ── Picker ────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  // Read when opening, so the first frame is already on the right side.
  const [popupDir, setPopupDir] = useState<Direction>("ltr");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const position = useFloatingPosition(rowRef, popupRef, {
    placement: "bottom-start",
    offset: 4,
    enabled: open,
  });

  const folded = foldForSearch(query.trim());
  const dialQuery = dialQueryOf(folded);
  const filtered = useMemo(() => {
    if (!folded) return listed;
    const hits = listed.filter((c) => matches(c, folded, dialQuery));
    return hits
      .map((c, i) => ({ c, i, r: rank(c, folded, dialQuery) }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.c);
  }, [listed, folded, dialQuery]);

  const openPicker = () => {
    if (disabled) return;
    setQuery("");
    setActiveIndex(listed.findIndex((c) => c.code === selected?.code));
    setPopupDir(directionOf(rowRef.current));
    setOpen(true);
  };

  const close = (focus: "trigger" | "number" | null) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (focus === "trigger") triggerRef.current?.focus();
    if (focus === "number") inputRef.current?.focus();
  };

  const pick = (code: string) => {
    // The picked country wins over a dial code typed in the text, so the text
    // is re-read as a national number.
    const nextText = parsed.dialCode !== null && isInternational(text) ? parsed.nationalNumber : text;
    emit(nextText, code);
    close("number");
  };

  useEscapeKey(() => close("trigger"), open);
  useOutsideClick(popupRef, () => close(null), open, triggerRef);

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "PageDown" || e.key === "PageUp") {
      e.preventDefault();
      const step = e.key === "PageDown" ? 10 : -10;
      setActiveIndex((i) => Math.min(Math.max(i + step, 0), filtered.length - 1));
    } else if (e.key === "Enter") {
      if (isImeComposing(e)) return;
      e.preventDefault();
      const item = filtered[activeIndex] ?? (folded ? filtered[0] : undefined);
      if (item) pick(item.code);
    } else if (e.key === "Tab") {
      // The list lives in a portal at the end of <body>; Tab would leave the
      // field for whatever follows it there. Return to the field instead.
      e.preventDefault();
      close(e.shiftKey ? "trigger" : "number");
    }
  };

  const active = filtered[activeIndex];
  const optionId = (code: string) => `${listId}-${code}`;

  return (
    <div
      data-react-fancy-phone-input=""
      data-country={selected?.code ?? ""}
      data-valid={parsed.valid ? "true" : "false"}
      data-reason={reason ?? ""}
      className={cn("flex flex-col gap-2", className)}
    >
      <label
        id={labelId}
        htmlFor={inputId}
        className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ms-0.5 text-red-800 dark:text-red-300">
            *
          </span>
        )}
      </label>

      <div ref={rowRef} role="group" aria-labelledby={labelId} className="flex items-stretch gap-2">
        <button
          ref={triggerRef}
          type="button"
          data-react-fancy-phone-input-country=""
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={
            selected
              ? `${msg.country}: ${selectedName} (+${selected.dialCode})`
              : msg.chooseCountry
          }
          onClick={() => (open ? close(null) : openPicker())}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              openPicker();
            }
          }}
          className={cn(
            inputBaseClasses,
            "inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm",
          )}
        >
          {selected ? (
            <>
              <span data-react-fancy-phone-input-flag="" aria-hidden="true" className="text-base leading-none">
                {flagOf(selected.code)}
              </span>
              <span dir="ltr" className="tabular-nums">{`+${selected.dialCode}`}</span>
            </>
          ) : (
            <span aria-hidden="true">+</span>
          )}
          <svg aria-hidden="true" className="h-4 w-4 shrink-0 opacity-70" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <Input
            ref={(el) => {
              inputRef.current = el;
              if (typeof ref === "function") ref(el);
              else if (ref) ref.current = el;
            }}
            data-react-fancy-phone-input-number=""
            id={inputId}
            mode="edit"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            // A phone number reads left-to-right in every script. `dir` on the
            // input isolates it, so the + and the digits keep their order inside
            // a right-to-left page; it still sits at the page's inline start.
            dir="ltr"
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            aria-invalid={shown ? true : undefined}
            aria-describedby={describedBy || undefined}
            onValueChange={(next) => {
              setTouched(false);
              emit(next, country);
            }}
            onBlur={(e) => {
              setTouched(true);
              onBlur?.(e);
            }}
            className={cn("min-h-11 rtl:text-end", errorClasses(shown))}
          />
        </div>
      </div>

      {description && (
        <p id={descriptionId} className="text-xs text-zinc-700 dark:text-zinc-300">
          {description}
        </p>
      )}
      {shown && (
        <p
          id={errorId}
          data-react-fancy-phone-input-error=""
          data-reason={error ? "" : (reason ?? "")}
          aria-live="polite"
          className="text-xs font-medium text-red-800 dark:text-red-300"
        >
          {shown}
        </p>
      )}

      {/* What a native submit posts: the E.164, never the half-typed text. */}
      {name ? (
        <input type="hidden" name={name} form={form} disabled={disabled} value={current ?? ""} />
      ) : null}

      {open && (
        <Portal>
          <div
            ref={popupRef}
            dir={popupDir}
            // A labelled dialog holding the search box and the country list: it
            // is the element in <body>, so it carries its own popup role.
            role="dialog"
            aria-label={msg.chooseCountry}
            data-react-fancy-phone-input-popup=""
            className="fixed z-50 flex min-w-[16rem] flex-col gap-1 rounded-xl border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-1 shadow-lg dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:shadow-zinc-950/50 fancy-scale-in"
            style={{ left: position.x, top: position.y, width: rowRef.current?.offsetWidth }}
          >
            <input
              data-react-fancy-phone-input-search=""
              type="text"
              role="combobox"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label={msg.search}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-activedescendant={active ? optionId(active.code) : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={onSearchKeyDown}
              className={cn(inputBaseClasses, "min-h-11 w-full rounded-lg px-3 text-sm")}
            />
            <ul
              id={listId}
              role="listbox"
              aria-label={msg.country}
              data-react-fancy-phone-input-listbox=""
              className="max-h-72 overflow-y-auto"
            >
              {filtered.map((c, i) => (
                <li
                  key={c.code}
                  id={optionId(c.code)}
                  role="option"
                  aria-selected={c.code === selected?.code}
                  data-react-fancy-phone-input-option={c.code}
                  data-active={i === activeIndex ? "true" : undefined}
                  ref={i === activeIndex ? (el) => el?.scrollIntoView?.({ block: "nearest" }) : undefined}
                  // Keep focus in the search box, so the list stays one tab stop.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c.code)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-start text-sm text-zinc-900 dark:text-zinc-100",
                    i === activeIndex
                      ? "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
                      : "hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))] dark:hover:bg-[color:var(--fancy-surface-hover-dark,color-mix(in_oklab,var(--color-zinc-800)_50%,transparent))]",
                    c.code === selected?.code && "font-semibold",
                  )}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {flagOf(c.code)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span dir="ltr" className="shrink-0 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {`+${c.dialCode}`}
                  </span>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && (
              <p role="status" className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                {msg.noResults}
              </p>
            )}
          </div>
        </Portal>
      )}
    </div>
  );
});

PhoneInput.displayName = "PhoneInput";

/** Whether the text starts an international number (`+` or `00`), ignoring separators. */
function isInternational(text: string): boolean {
  let zeros = 0;
  for (const ch of text) {
    if (ch === "+" || ch === "＋") return zeros === 0;
    if (ch === "0") {
      zeros++;
      if (zeros === 2) return true;
      continue;
    }
    if (ch === " " || ch === "(" || ch === "-" || ch === ".") continue;
    return false;
  }
  return false;
}
