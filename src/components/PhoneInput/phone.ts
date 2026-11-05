import { COUNTRY_ROWS, LEADING_DIGIT_HINTS, MAIN_COUNTRY } from "./phone-countries";
import type { PhoneCountry, PhoneInputReason, PhoneParse, ParsePhoneOptions } from "./PhoneInput.types";

/**
 * Reading a phone number, by hand.
 *
 * Every step is a single pass over the characters, with no regular expression:
 * the text comes from a person or a paste, and a backtracking pattern over it is
 * a ReDoS waiting for the right input. Linear time is pinned by a test.
 */

export const PHONE_COUNTRIES: readonly PhoneCountry[] = COUNTRY_ROWS.map(
  ([code, dialCode, minLength, maxLength, trunkPrefixes]) => ({
    code,
    dialCode,
    minLength,
    maxLength,
    trunkPrefixes: trunkPrefixes ?? ["0"],
  }),
);

const BY_CODE = new Map(PHONE_COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string | null | undefined): PhoneCountry | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

/** The first code point of "0" in each script whose digits are read. */
const DIGIT_ZEROS = [
  0x30, // ASCII
  0x660, // Arabic-Indic
  0x6f0, // Extended Arabic-Indic (Persian, Urdu)
  0x966, // Devanagari
  0x9e6, // Bengali
  0xe50, // Thai
  0x1040, // Myanmar
  0xff10, // fullwidth
];

function digitOf(cp: number): number {
  for (const zero of DIGIT_ZEROS) {
    if (cp >= zero && cp <= zero + 9) return cp - zero;
  }
  return -1;
}

/** What people put between digits. Skipped. */
function isSeparator(cp: number): boolean {
  return (
    cp === 0x20 || // space
    cp === 0x09 || // tab
    cp === 0xa0 || // no-break space
    cp === 0x2007 || // figure space
    cp === 0x2009 || // thin space
    cp === 0x202f || // narrow no-break space
    cp === 0x3000 || // ideographic space
    cp === 0x2d || // hyphen-minus
    (cp >= 0x2010 && cp <= 0x2015) || // hyphens and dashes
    cp === 0x2212 || // minus sign
    cp === 0xff0d || // fullwidth hyphen-minus
    cp === 0x2e || // full stop
    cp === 0x2f || // solidus
    cp === 0x28 || // (
    cp === 0x29 || // )
    cp === 0xff08 || // fullwidth (
    cp === 0xff09 // fullwidth )
  );
}

/**
 * Invisible direction controls. Text copied from a right-to-left page often
 * wraps a number in these, and they are not part of it.
 */
function isDirectionMark(cp: number): boolean {
  return (
    cp === 0x200e ||
    cp === 0x200f ||
    cp === 0x061c ||
    cp === 0xfeff ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069)
  );
}

function isPlus(cp: number): boolean {
  return cp === 0x2b || cp === 0xff0b;
}

interface Scan {
  digits: string;
  plus: boolean;
  invalid: boolean;
}

/** One pass. Stops at the first character that cannot be in a phone number. */
function scan(text: string): Scan {
  let digits = "";
  let plus = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const d = digitOf(cp);
    if (d >= 0) {
      digits += String(d);
    } else if (isPlus(cp)) {
      // Only as the first thing typed: "95+9" is not a number.
      if (plus || digits.length > 0) return { digits, plus, invalid: true };
      plus = true;
    } else if (!isSeparator(cp) && !isDirectionMark(cp)) {
      return { digits, plus, invalid: true };
    }
  }

  return { digits, plus, invalid: false };
}

function lengthReason(nsn: string, country: PhoneCountry): PhoneInputReason | null {
  if (nsn.length < country.minLength) return "too_short";
  // E.164 caps the whole number at 15 digits, country code included.
  if (nsn.length > country.maxLength || nsn.length + country.dialCode.length > 15) return "too_long";
  return null;
}

/**
 * Drop the trunk prefix if the person typed one. Always: keeping it whenever the
 * longer reading happens to fit the length range would turn a half-typed
 * "06 12 34 56 7" into a "valid" +33 0612 34567, which is exactly the wrong
 * E.164 a partial number must never produce. The cost is one case: a national
 * number that genuinely starts with the trunk digit, typed WITHOUT the trunk
 * prefix (Russia's 800 numbers, dialled "8 800" at home), reads as too short.
 * That is null with a reason, never a wrong number.
 */
function stripTrunk(digits: string, country: PhoneCountry): string {
  for (const trunk of country.trunkPrefixes) {
    if (trunk && digits.startsWith(trunk)) return digits.slice(trunk.length);
  }
  return digits;
}

function allowedSet(countries: readonly string[] | undefined): Set<string> | null {
  if (!countries) return null;
  const set = new Set<string>();
  for (const c of countries) set.add(c.toUpperCase());
  return set;
}

/** Countries that share a dial code, in table order. */
function countriesFor(dialCode: string, allowed: Set<string> | null): PhoneCountry[] {
  const out: PhoneCountry[] = [];
  for (const c of PHONE_COUNTRIES) {
    if (c.dialCode === dialCode && (!allowed || allowed.has(c.code))) out.push(c);
  }
  return out;
}

/**
 * Which of several countries sharing a dial code a number belongs to. The
 * leading-digit hint first, then the selected country, then the main one.
 * Approximate by construction; see LEADING_DIGIT_HINTS.
 */
function pickShared(
  candidates: PhoneCountry[],
  nsn: string,
  selected: string | null,
): PhoneCountry {
  const dial = candidates[0].dialCode;
  const hints = LEADING_DIGIT_HINTS[dial];
  if (hints) {
    let best: PhoneCountry | undefined;
    let bestLength = 0;
    for (const c of candidates) {
      for (const prefix of hints[c.code] ?? []) {
        if (prefix.length > bestLength && nsn.startsWith(prefix)) {
          best = c;
          bestLength = prefix.length;
        }
      }
    }
    if (best) return best;
  }
  const chosen = candidates.find((c) => c.code === selected);
  if (chosen) return chosen;
  return candidates.find((c) => c.code === MAIN_COUNTRY[dial]) ?? candidates[0];
}

function result(
  country: PhoneCountry | undefined,
  nsn: string,
  reason: PhoneInputReason | null,
  approximate = false,
): PhoneParse {
  const valid = reason === null && country !== undefined && nsn.length > 0;
  return {
    value: valid ? `+${country!.dialCode}${nsn}` : null,
    country: country?.code ?? null,
    dialCode: country?.dialCode ?? null,
    nationalNumber: nsn,
    valid,
    reason,
    approximate,
  };
}

/**
 * Read what a person typed or pasted into an E.164 number and a reason.
 *
 * - `+` or `00` starts an international number; the country comes from its dial
 *   code. Other international prefixes (011 in North America, 010 in Japan) are
 *   not recognised: type `+`.
 * - Anything else is a national number in `options.country`, with its trunk
 *   prefix dropped.
 * - Blank (or separators only) is no value and no reason.
 * - The value is `null` unless the number is whole. Lengths are a sanity check:
 *   a valid result can still be a number nobody holds.
 */
export function parsePhone(text: string, options: ParsePhoneOptions = {}): PhoneParse {
  const allowed = allowedSet(options.countries);
  const selectedCode = options.country ? options.country.toUpperCase() : null;
  const selected =
    selectedCode && (!allowed || allowed.has(selectedCode)) ? findCountry(selectedCode) : undefined;

  const { digits, plus, invalid } = scan(text);

  if (invalid) return result(selected, digits, "invalid_chars");
  if (!plus && digits.length === 0) return result(selected, "", null);

  const international = plus || digits.startsWith("00");
  if (!international) {
    if (!selected) return result(undefined, digits, "unknown_country");
    const nsn = stripTrunk(digits, selected);
    return result(selected, nsn, lengthReason(nsn, selected));
  }

  const rest = plus ? digits : digits.slice(2);

  // Country codes are prefix-free, so the first that matches is the only one.
  for (let length = 1; length <= 3 && length <= rest.length; length++) {
    const dial = rest.slice(0, length);
    const anywhere = countriesFor(dial, null);
    if (anywhere.length === 0) continue;

    const candidates = allowed ? anywhere.filter((c) => allowed.has(c.code)) : anywhere;
    let nsn = rest.slice(length);
    if (candidates.length === 0) return result(undefined, nsn, "unknown_country");

    const country =
      candidates.length === 1 ? candidates[0] : pickShared(candidates, nsn, selectedCode);
    // "+44 (0)20 ..." : the national trunk 0, written inside an international number.
    if (country.trunkPrefixes.includes("0") && nsn.startsWith("0")) nsn = nsn.slice(1);

    return result(country, nsn, lengthReason(nsn, country), anywhere.length > 1);
  }

  // No dial code yet. Short of three digits, it may still become one.
  if (rest.length < 3) {
    for (const c of PHONE_COUNTRIES) {
      if (c.dialCode.startsWith(rest) && (!allowed || allowed.has(c.code))) {
        return result(undefined, "", "too_short");
      }
    }
  }
  return result(undefined, "", "unknown_country");
}

/** The national number an E.164 value holds, for display. "" if it holds none. */
export function nationalNumberOf(
  value: string | null,
  options: ParsePhoneOptions = {},
): { nationalNumber: string; country: string | null } {
  if (!value) return { nationalNumber: "", country: null };
  const parsed = parsePhone(value.startsWith("+") ? value : `+${value}`, options);
  return { nationalNumber: parsed.nationalNumber, country: parsed.country };
}

/** A flag from two regional-indicator letters. No image, so nothing to load. */
export function flagOf(code: string): string {
  if (code.length !== 2) return "";
  let out = "";
  for (let i = 0; i < 2; i++) {
    const c = code.toUpperCase().charCodeAt(i);
    if (c < 65 || c > 90) return "";
    out += String.fromCodePoint(0x1f1e6 + (c - 65));
  }
  return out;
}

/** Lower-case and without accents, so "aland" finds "Åland". */
export function foldForSearch(text: string): string {
  let out = "";
  for (const ch of text.normalize("NFD").toLowerCase()) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x300 && cp <= 0x36f) continue;
    out += ch;
  }
  return out;
}
