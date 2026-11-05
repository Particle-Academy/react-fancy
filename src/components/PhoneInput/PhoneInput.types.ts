import type { FocusEvent } from "react";

/** Why a number is not (yet) a valid E.164. */
export type PhoneInputReason = "too_short" | "too_long" | "invalid_chars" | "unknown_country";

/** One row of the first-party country table. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, upper case. */
  code: string;
  /** The ITU-T E.164 country code, digits only: `"95"`. */
  dialCode: string;
  /** Shortest national significant number, in digits. A sanity check, not validation. */
  minLength: number;
  /** Longest national significant number, in digits. A sanity check, not validation. */
  maxLength: number;
  /** What is typed before the number within the country (`"0"`). Empty: none. */
  trunkPrefixes: readonly string[];
}

/** What the component read, reported with every value. JSON-serialisable. */
export interface PhoneInputDetail {
  /** ISO 3166-1 alpha-2 of the country the number was read in, or `null`. */
  country: string | null;
  /** Its dial code, digits only, or `null`. */
  dialCode: string | null;
  /** The national significant number: digits only, no trunk prefix. */
  nationalNumber: string;
  /** Whether the value is an E.164 number that passed the length check. */
  valid: boolean;
  /** Why it is not valid. `null` when valid, and when blank. */
  reason: PhoneInputReason | null;
  /**
   * The dial code is shared (`+1`, `+7`, `+44`, …) and `country` is a guess from
   * the number's leading digits or the selected country. The E.164 is exact
   * either way; only `country` may be wrong.
   */
  approximate: boolean;
}

export interface PhoneParse extends PhoneInputDetail {
  /** The E.164 number (`+959…`), or `null` unless the number is whole. */
  value: string | null;
}

export interface ParsePhoneOptions {
  /** The selected country, for a national number and as a tie-break for shared dial codes. */
  country?: string | null;
  /** Restrict to these countries. A dial code none of them owns is `unknown_country`. */
  countries?: readonly string[];
}

/**
 * Text the component shows, for a host working in another language. `{country}`
 * in a reason message is replaced with the country's name in `locale`.
 */
export interface PhoneInputMessages {
  /** Default: "This number is too short for {country}." */
  too_short?: string;
  /** Default: "This number is too long for {country}." */
  too_long?: string;
  /** Default: "Use digits only. Spaces, dashes, brackets and a leading + are fine." */
  invalid_chars?: string;
  /** Default: "Choose a country, or start the number with + and its country code." */
  unknown_country?: string;
  /** Accessible name of the picker, before the chosen country. Default: "Country". */
  country?: string;
  /** Accessible name of the picker when no country is chosen. Default: "Choose a country". */
  chooseCountry?: string;
  /** Accessible name of the search box. Default: "Search countries". */
  search?: string;
  /** Shown when the search matches nothing. Default: "No matching countries". */
  noResults?: string;
}

export interface PhoneInputProps {
  /** The number in E.164 (`+959451234567`), or `null` when there is none. */
  value?: string | null;
  /** Starting value when uncontrolled. */
  defaultValue?: string | null;
  /**
   * Called when the value or the reading of it changes. `value` is `null` for
   * blank and for anything that is not yet a whole number; `detail` says why.
   */
  onValueChange?: (value: string | null, detail: PhoneInputDetail) => void;
  /** ISO 3166-1 alpha-2 selected at first, and the tie-break for a shared dial code. */
  defaultCountry?: string;
  /** Restrict the picker to these ISO codes, in this order. Default: every country, by name. */
  countries?: string[];
  /** BCP 47 locale for country names (`Intl.DisplayNames`). Default: the browser's. */
  locale?: string;
  /** Visible label. Required: an unlabelled phone field fails WCAG. */
  label: string;
  description?: string;
  /** A host's message. Shown instead of the built-in one. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Posts the E.164 (or `""`) through a hidden input. */
  name?: string;
  form?: string;
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  messages?: PhoneInputMessages;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
}
