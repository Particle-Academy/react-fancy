# PhoneInput

A country picker and a number field whose value is an E.164 number (`+95945123456`) or `null`. Blank is `null`, half-typed text is `null` with a reason, and pasting a full international number picks its country.

It is a **light** phone field: a first-party table of dial codes and national-number lengths, and no phone-number library or data. **The length check is a sanity check, not validation.** It catches a number that is plainly too short or too long for its country; it does not know which ranges are allocated, whether a number is mobile, or whether anyone holds it. Validate on your server (Twilio Lookup, for example) before you rely on a number.

**`detail.valid` means plausible, not valid.** Real per-country lengths apply only to the rows whose lengths were checked against a cited plan: Benin, Côte d'Ivoire, Colombia, Gabon, Kazakhstan, Lithuania, Myanmar, Saint Helena and Mayotte (`PHONE_COUNTRIES[i].lengthVerified`). Every other country accepts 4 to 15 digits including its dial code, the widest E.164 allows, so there the check is digits, a known dial code and the E.164 maximum. That is deliberate: a range that is too tight would refuse a real person's number and block their form, while a wrong number accepted here is caught by your server.

## Import

```tsx
import { PhoneInput } from "@particle-academy/react-fancy";
// or the subpath
import { PhoneInput } from "@particle-academy/react-fancy/phone-input";
```

## Basic Usage

```tsx
const [phone, setPhone] = useState<string | null>(null);

<PhoneInput label="Mobile number" value={phone} onValueChange={setPhone} defaultCountry="MM" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| null` | - | The number in E.164, or `null` |
| `defaultValue` | `string \| null` | `null` | Starting value when uncontrolled |
| `onValueChange` | `(value: string \| null, detail: PhoneInputDetail) => void` | - | Called when the value or the reading of it changes |
| `label` | `string` | required | Visible label for the number |
| `defaultCountry` | `string` | - | ISO 3166-1 alpha-2 selected at first. Also the tie-break for a shared dial code |
| `countries` | `string[]` | every country, by name | Restrict the picker to these ISO codes, in this order |
| `locale` | `string` | the browser's | BCP 47 locale for country names. Pass it when you render on the server, or the names can differ between server and browser |
| `description` | `string` | - | Help text, tied to the number with `aria-describedby` |
| `error` | `string` | - | Your own message, shown instead of the built-in one |
| `messages` | `PhoneInputMessages` | English | Every piece of text the component shows, for a host working in another language |
| `name` | `string` | - | Posts the E.164 (or `""`) through a hidden input, never the text on screen |
| `required`, `disabled`, `placeholder`, `autoFocus`, `id`, `form`, `className`, `onBlur` | | | As usual. `id` is the number input's |

## What `detail` reports

```ts
{
  country: "MM",            // ISO code the number was read in, or null
  dialCode: "95",           // or null
  nationalNumber: "945123456", // digits only, no trunk prefix
  valid: true,
  reason: null,             // "too_short" | "too_long" | "invalid_chars" | "unknown_country" | null
  approximate: false,       // true when the dial code is shared and country is a guess
}
```

## What it does with what you type

| Typed (country MM) | `value` | `reason` |
|---|---|---|
| (blank) | `null` | `null`: blank is not an error. Use `required` |
| `09 45` | `null` | `too_short` |
| `09 4512 3456` | `+95945123456` | `null`. The trunk prefix 0 is dropped |
| `+959 4512 3456`, `00959 4512 3456`, `+95 (9) 4512-3456` | `+95945123456` | `null`. The country follows the dial code |
| `+44 (0)20 7946 0958` | `+442079460958` | `null`. A `(0)` inside an international number is dropped |
| `09 45ab` | `null` | `invalid_chars`. Letters are never read past |
| `+999 1234` | `null` | `unknown_country` |
| `4512 3456` with no country chosen | `null` | `unknown_country` |

Digits in Arabic-Indic, Persian, Devanagari, Bengali, Thai, Myanmar and fullwidth forms are read as digits, and the invisible direction marks a right-to-left page wraps around copied text are ignored. Only `+` and `00` start an international number: other international prefixes (`011` in North America, `010` in Japan) are not recognised.

**Partial input.** Nothing below a country's shortest length is ever emitted, so in a verified fixed-length plan (Colombia, Côte d'Ivoire) a half-typed number is always `null`. In an unverified row the shortest length is 4 digits, so a half-typed number of 4 digits or more is emitted. Where a plan has numbers of different lengths (Myanmar runs 7 to 10 digits), a prefix of a long number can itself be a valid length, and is emitted: a length check cannot tell "still typing" from "done". Use `detail` and your server for that.

**When messages show.** `invalid_chars` and `too_long` show at once, because typing more cannot fix them. `too_short` and `unknown_country` show when focus leaves the field, and clear while you type again. The message is the readable sentence for the reason, in `messages` if you pass them; `{country}` is replaced with the country's name. Every reason also reaches `setCustomValidity`, so a native form submit is blocked while the number is not whole.

## Shared dial codes

`+1` (the North American Numbering Plan), `+7`, `+39`, `+44`, `+47`, `+61`, `+212`, `+262`, `+358`, `+590` and `+599` belong to more than one country. The country is chosen in this order, and **is approximate** (`detail.approximate` is `true`):

1. The number's leading digits, where a short first-party table knows them: Canadian and Caribbean area codes under `+1`, Kazakhstan's `6` and `7` under `+7`, the Crown Dependencies' fixed-line codes under `+44`, Svalbard, Cocos and Christmas Islands, Mayotte, Aland, Vatican City and the Caribbean Netherlands.
2. The selected country (or `defaultCountry`), if it shares the code.
3. The main country for the code: `+1` is the United States, `+7` Russia, `+44` the United Kingdom.

The E.164 is exact whichever country is chosen; only `detail.country` and the flag can be wrong, for instance for a ported number. A new Canadian area code reads as the United States until it is added to the table.

## Country picker

A button showing the flag and dial code, named for assistive tech as "Country: Myanmar (+95)". It opens a searchable list: type a name in the page's language, an ISO code (`mm`) or a dial code (`+95`). ArrowDown / ArrowUp move through the list, PageDown / PageUp by ten, Enter picks (the first match if nothing is highlighted), Escape closes and returns to the button, and Tab returns to the number. ArrowDown on the closed button opens it. Picking a country while the number starts with `+` re-reads it as a national number in that country.

Names come from `Intl.DisplayNames` in `locale`. Flags are Unicode regional-indicator letters, not images: Windows does not draw them as flags and shows the two letters instead, which is still the country code.

## Right-to-left

The number input has `dir="ltr"`, so the `+` and the digits keep their order inside a right-to-left page, isolated from the text around them, and the digits align to the page's inline start (the right, in RTL). Chromium already lays a `type="tel"` input out left-to-right; the attribute is what isolates it, and is the part the HTML standard specifies rather than a browser default. Only Chromium was checked. The dial codes in the picker and list are isolated left-to-right too. The label, the picker and the list follow the page: under `dir="rtl"` the picker sits on the right. Arrow keys inside the number move the caret the way they point.

## Accessibility

A visible label is required. The description and the message are tied to the number with `aria-describedby`, `aria-invalid` is set while a message shows, and the message is announced politely. The picker, its search box and the list each have an accessible name, the list uses `aria-activedescendant`, and every target is at least 44 by 44 CSS pixels. The message and description text measured 8.4:1 and 10.4:1 against the default white surface in Chromium; check your own theme, and dark mode, against 7:1.

## Agents

The component is controlled, so an agent writes `value` as an E.164 string and the text and picker follow: the input shows the national number and the picker its country. `detail` is plain JSON. Handles: `[data-react-fancy-phone-input]` (with `data-country`, `data-valid` and `data-reason`), `-country`, `-number`, `-error`, `-search`, `-listbox` and `-option` (VALUE is the ISO code). `parsePhone(text, { country, countries })` is exported, so an agent or a server-side render can read a number the same way the field does, and `PHONE_COUNTRIES` is the table itself.

## Data

`src/components/PhoneInput/phone-countries.ts` holds one row per country: ISO code, dial code, shortest and longest national number, trunk prefixes and a `VERIFIED` / `UNVERIFIED` status, each with its source in a comment. Dial codes come from the ITU-T E.164 list of assigned country codes. A `VERIFIED` row's length was checked against the country's numbering plan as cited in its comment. An `UNVERIFIED` row's length is the E.164 maximum, and its comment keeps the range that was transcribed from memory. To verify one: check it against the plan, put the range in, mark it `VERIFIED`, and cite the source. A test holds every unverified row at the E.164 maximum, so a narrowed range without a status change fails the build.
