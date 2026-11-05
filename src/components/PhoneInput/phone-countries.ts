/**
 * Country to dial code and national-number length, first party.
 *
 * LENGTHS ARE A SANITY CHECK, NOT VALIDATION. They catch a number that is
 * plainly too short or too long for its country. They do not know which ranges
 * are allocated, whether a number is mobile or fixed, or whether it is in
 * service. Exact validation belongs on a server (Twilio Lookup, for example).
 *
 * Each row: [ISO 3166-1 alpha-2, dial code, min, max, trunk prefixes, status]
 *
 * - min / max count the NATIONAL SIGNIFICANT NUMBER (NSN): the digits after the
 *   country code, without a trunk prefix.
 * - trunk prefixes are what a person types before the NSN when dialling within
 *   the country. An empty list means the plan has none AND a leading 0 is part
 *   of the number (Italy), so it must not be dropped.
 * - status is VERIFIED only where the length was checked against a source this
 *   table cites (the WIKI rows). Every other row is UNVERIFIED, and its range is
 *   the widest E.164 allows: 4 to (15 - dial-code digits). A range written from
 *   memory that is too tight would refuse a real person's valid number, block
 *   their form, and say `too_long` at once; accepting a wrong number is the
 *   lesser harm, because the server validates. Each UNVERIFIED comment keeps the
 *   range that was transcribed, so verifying a row is: check it against the
 *   plan, put the range back, mark it VERIFIED and cite the source.
 *
 * Sources, recorded per row in its comment:
 *
 *   E164  the dial code, from "List of ITU-T Recommendation E.164 assigned
 *         country codes" (ITU-T, complement to E.164) and the index of national
 *         numbering plans at https://www.itu.int/oth/T0202
 *   NNP   the length, from the national numbering plan the country has
 *         notified to the ITU (same index)
 *   NANPA the North American Numbering Plan: a 10-digit NSN everywhere
 *   WIKI  checked on 2026-11-05 against the "Telephone numbers in <country>"
 *         article, which cites the plan, because the ITU document itself was
 *         not readable as text
 *   wide  the plan is variable-length or the exact range was not confirmed,
 *         so the range is deliberately wide. Wide ranges let more wrong numbers
 *         through and refuse fewer right ones, which is the right way to be wrong
 *         for a sanity check.
 *
 * Dial codes and trunk prefixes in UNVERIFIED rows were also transcribed, not
 * re-checked line by line; only their LENGTHS were widened. Treat a row as a
 * claim to correct, and correct it here with its source.
 *
 * Not listed, because they have no dial code of their own: AQ, BV, GS, HM,
 * PN, TF, UM. XK (Kosovo) is a user-assigned code, not ISO 3166-1, and is
 * listed because +383 is assigned to it and `Intl.DisplayNames` names it.
 */
export type LengthStatus = "verified" | "unverified";

export type CountryRow = readonly [
  code: string,
  dialCode: string,
  minLength: number,
  maxLength: number,
  trunkPrefixes: readonly string[],
  status: LengthStatus,
];

const ZERO: readonly string[] = ["0"];
const NONE: readonly string[] = [];
const NANP_TRUNK: readonly string[] = ["1"];
const VERIFIED: LengthStatus = "verified";
const UNVERIFIED: LengthStatus = "unverified";

export const COUNTRY_ROWS: readonly CountryRow[] = [
  ["AD", "376", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-9 from memory of NNP wide)
  ["AE", "971", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["AF", "93", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["AG", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 268))
  ["AI", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 264))
  ["AL", "355", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-9 from memory of NNP wide)
  ["AM", "374", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["AO", "244", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["AR", "54", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-11 from memory of NNP (mobile adds a 9 internationally))
  ["AS", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 684))
  ["AT", "43", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 4-13 from memory of NNP wide: open numbering plan)
  ["AU", "61", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["AW", "297", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["AX", "358", 4, 12, ZERO, UNVERIFIED], // E164 (shared with FI, 358 18); length UNVERIFIED, widened to the E.164 maximum (was 5-12 from memory of NNP wide, as FI)
  ["AZ", "994", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["BA", "387", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["BB", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 246))
  ["BD", "880", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-10 from memory of NNP wide: fixed lines vary)
  ["BE", "32", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["BF", "226", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["BG", "359", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-9 from memory of NNP wide)
  ["BH", "973", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["BI", "257", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["BJ", "229", 8, 10, NONE, VERIFIED], // E164; WIKI: "01" prefixed to every number on 2024-11-30; wide, 8 kept for the old form
  ["BL", "590", 4, 12, ZERO, UNVERIFIED], // E164 (shared with GP, MF); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["BM", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 441))
  ["BN", "673", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["BO", "591", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["BQ", "599", 4, 12, NONE, UNVERIFIED], // E164 (shared with CW: 599 3, 4, 7); length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["BR", "55", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-11 from memory of NNP)
  ["BS", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 242))
  ["BT", "975", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["BW", "267", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["BY", "375", 4, 12, ["80", "8"], UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP (dialled 8 0XX nationally))
  ["BZ", "501", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["CA", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA)
  ["CC", "61", 4, 13, ZERO, UNVERIFIED], // E164 (shared with AU, 61 89162); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP, as AU)
  ["CD", "243", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["CF", "236", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["CG", "242", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP (the leading 0 is part of the number))
  ["CH", "41", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["CI", "225", 10, 10, NONE, VERIFIED], // E164; WIKI: 10 digits since 2021-01-31, leading 0 is part of the number
  ["CK", "682", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-5 from memory of NNP)
  ["CL", "56", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["CM", "237", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["CN", "86", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-12 from memory of NNP wide: fixed lines vary by area code)
  ["CO", "57", 10, 10, ZERO, VERIFIED], // E164; WIKI: fixed and mobile 10 digits since 2021
  ["CR", "506", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["CU", "53", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-8 from memory of NNP wide)
  ["CV", "238", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["CW", "599", 4, 12, NONE, UNVERIFIED], // E164 (shared with BQ: 599 9); length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["CX", "61", 4, 13, ZERO, UNVERIFIED], // E164 (shared with AU, 61 89164); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP, as AU)
  ["CY", "357", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["CZ", "420", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["DE", "49", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-13 from memory of NNP wide: open numbering plan)
  ["DJ", "253", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["DK", "45", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["DM", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 767))
  ["DO", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 809, 829, 849))
  ["DZ", "213", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["EC", "593", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["EE", "372", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["EG", "20", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["EH", "212", 4, 12, ZERO, UNVERIFIED], // E164 (shared with MA); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP, as MA)
  ["ER", "291", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["ES", "34", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["ET", "251", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["FI", "358", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-12 from memory of NNP wide: variable-length plan)
  ["FJ", "679", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["FK", "500", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-5 from memory of NNP)
  ["FM", "691", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["FO", "298", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["FR", "33", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GA", "241", 7, 8, NONE, VERIFIED], // E164; WIKI: 7 digits, 8 for mobiles renumbered in 2019; the 0 is part of the number
  ["GB", "44", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-10 from memory of NNP (10 for almost all; a few 9 and 7))
  ["GD", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 473))
  ["GE", "995", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GF", "594", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GG", "44", 4, 13, ZERO, UNVERIFIED], // E164 (shared with GB, 44 1481); length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP, as GB)
  ["GH", "233", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GI", "350", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["GL", "299", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["GM", "220", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["GN", "224", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP wide)
  ["GP", "590", 4, 12, ZERO, UNVERIFIED], // E164 (shared with BL, MF); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GQ", "240", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["GR", "30", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP)
  ["GT", "502", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["GU", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 671))
  ["GW", "245", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["GY", "592", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["HK", "852", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["HN", "504", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["HR", "385", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["HT", "509", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["HU", "36", 4, 13, ["06"], UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP (trunk prefix 06))
  ["ID", "62", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-12 from memory of NNP wide)
  ["IE", "353", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP)
  ["IL", "972", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["IM", "44", 4, 13, ZERO, UNVERIFIED], // E164 (shared with GB, 44 1624); length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP, as GB)
  ["IN", "91", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP)
  ["IO", "246", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["IQ", "964", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["IR", "98", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP)
  ["IS", "354", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP)
  ["IT", "39", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-11 from memory of NNP wide (the leading 0 of a fixed line is part of the number))
  ["JE", "44", 4, 13, ZERO, UNVERIFIED], // E164 (shared with GB, 44 1534); length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP, as GB)
  ["JM", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 876, 658))
  ["JO", "962", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["JP", "81", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-10 from memory of NNP)
  ["KE", "254", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-10 from memory of NNP wide)
  ["KG", "996", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["KH", "855", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["KI", "686", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-8 from memory of NNP wide)
  ["KM", "269", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["KN", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 869))
  ["KP", "850", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-12 from memory of NNP wide: not confirmed)
  ["KR", "82", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-11 from memory of NNP wide)
  ["KW", "965", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["KY", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 345))
  ["KZ", "7", 10, 10, ["8"], VERIFIED], // E164 (shared with RU: 7 6, 7 7); WIKI: zones 6xx and 7xx
  ["LA", "856", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["LB", "961", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["LC", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 758))
  ["LI", "423", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP)
  ["LK", "94", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["LR", "231", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["LS", "266", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["LT", "370", 8, 8, ["0", "8"], VERIFIED], // E164; WIKI: trunk 0 since 2024-03-01, the old 8 still read
  ["LU", "352", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 4-11 from memory of NNP wide: open numbering plan)
  ["LV", "371", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["LY", "218", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["MA", "212", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["MC", "377", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["MD", "373", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["ME", "382", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MF", "590", 4, 12, ZERO, UNVERIFIED], // E164 (shared with GP, BL); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["MG", "261", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["MH", "692", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["MK", "389", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["ML", "223", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MM", "95", 7, 10, ZERO, VERIFIED], // E164; WIKI: 8 to 11 digits with the trunk 0, so 7 to 10; mobiles 8 to 10
  ["MN", "976", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MO", "853", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MP", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 670))
  ["MQ", "596", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["MR", "222", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MS", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 664))
  ["MT", "356", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["MU", "230", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["MV", "960", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["MW", "265", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["MX", "52", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP (10 digits since 2019))
  ["MY", "60", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP)
  ["MZ", "258", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["NA", "264", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["NC", "687", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["NE", "227", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["NF", "672", 4, 12, NONE, UNVERIFIED], // E164 (672 3); length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["NG", "234", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-10 from memory of NNP wide)
  ["NI", "505", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["NL", "31", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["NO", "47", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-8 from memory of NNP (8, with a few 5-digit service numbers))
  ["NP", "977", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["NR", "674", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["NU", "683", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 4-7 from memory of NNP wide)
  ["NZ", "64", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP)
  ["OM", "968", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["PA", "507", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["PE", "51", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["PF", "689", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-8 from memory of NNP wide (8 since 2017))
  ["PG", "675", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["PH", "63", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP)
  ["PK", "92", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["PL", "48", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["PM", "508", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["PR", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 787, 939))
  ["PS", "970", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["PT", "351", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["PW", "680", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["PY", "595", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["QA", "974", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["RE", "262", 4, 12, ZERO, UNVERIFIED], // E164 (shared with YT); length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["RO", "40", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["RS", "381", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-9 from memory of NNP wide)
  ["RU", "7", 4, 14, ["8"], UNVERIFIED], // E164 (shared with KZ); length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP (trunk prefix 8))
  ["RW", "250", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["SA", "966", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["SB", "677", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-7 from memory of NNP wide)
  ["SC", "248", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["SD", "249", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["SE", "46", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-10 from memory of NNP wide: variable-length plan)
  ["SG", "65", 4, 13, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["SH", "290", 5, 5, NONE, VERIFIED], // E164; WIKI: fixed five-digit plan since 2013-10-01
  ["SI", "386", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["SJ", "47", 4, 13, NONE, UNVERIFIED], // E164 (shared with NO, 47 79); length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP, as NO)
  ["SK", "421", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["SL", "232", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["SM", "378", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-10 from memory of NNP wide)
  ["SN", "221", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["SO", "252", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["SR", "597", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-7 from memory of NNP)
  ["SS", "211", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["ST", "239", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-7 from memory of NNP)
  ["SV", "503", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["SX", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 721))
  ["SY", "963", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["SZ", "268", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["TC", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 649))
  ["TD", "235", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["TG", "228", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["TH", "66", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["TJ", "992", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["TK", "690", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 4-7 from memory of NNP wide)
  ["TL", "670", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-8 from memory of NNP)
  ["TM", "993", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["TN", "216", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["TO", "676", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-7 from memory of NNP wide)
  ["TR", "90", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP)
  ["TT", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 868))
  ["TV", "688", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-6 from memory of NNP)
  ["TW", "886", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["TZ", "255", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["UA", "380", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["UG", "256", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["US", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA)
  ["UY", "598", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-8 from memory of NNP)
  ["UZ", "998", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["VA", "39", 4, 13, NONE, UNVERIFIED], // E164 (shared with IT, 39 06698); length UNVERIFIED, widened to the E.164 maximum (was 6-11 from memory of NNP, as IT)
  ["VC", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 784))
  ["VE", "58", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NNP)
  ["VG", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 284))
  ["VI", "1", 4, 14, NANP_TRUNK, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 10-10 from memory of NANPA (NPA 340))
  ["VN", "84", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-10 from memory of NNP wide)
  ["VU", "678", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-7 from memory of NNP wide)
  ["WF", "681", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 6-6 from memory of NNP)
  ["WS", "685", 4, 12, NONE, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-7 from memory of NNP wide)
  ["XK", "383", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 8-9 from memory of NNP)
  ["YE", "967", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 7-9 from memory of NNP wide)
  ["YT", "262", 9, 9, ZERO, VERIFIED], // E164 (shared with RE: 262 269, 639); WIKI
  ["ZA", "27", 4, 13, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["ZM", "260", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 9-9 from memory of NNP)
  ["ZW", "263", 4, 12, ZERO, UNVERIFIED], // E164; length UNVERIFIED, widened to the E.164 maximum (was 5-10 from memory of NNP wide: fixed lines vary)
];

/**
 * Which country a shared dial code means when nothing else decides. This is a
 * convention (the country that holds most of the numbers), not a fact about
 * any one number.
 */
export const MAIN_COUNTRY: Readonly<Record<string, string>> = {
  "1": "US",
  "7": "RU",
  "39": "IT",
  "44": "GB",
  "47": "NO",
  "61": "AU",
  "212": "MA",
  "262": "RE",
  "358": "FI",
  "590": "GP",
  "599": "CW",
};

/**
 * Leading digits of the NSN that point at one country of a shared dial code.
 * APPROXIMATE, and documented as such: these name the country a number was
 * allocated to, and a ported or roaming number can say otherwise. The E.164
 * the component emits does not depend on them, only `detail.country` does.
 *
 * - +1: area codes (NPAs). Canada's list is the one in WIKI ("Telephone numbers
 *   in Canada", last edited 2026-01-27; NANPA itself was not reached), the
 *   others are NANPA's Caribbean and territory NPAs. A new Canadian NPA reads
 *   as US until it is added here.
 * - +7: Kazakhstan holds zones 6xx and 7xx (WIKI).
 * - +44: the Crown Dependencies' fixed-line area codes only. Their mobile ranges
 *   sit among UK mobiles and are not listed.
 * - +47 79 Svalbard, +61 89162 / 89164 Cocos and Christmas Islands, +262 269 /
 *   639 Mayotte (WIKI), +358 18 Aland, +39 06698 Vatican City, +599 3 / 4 / 7
 *   Caribbean Netherlands.
 * - +212 (Western Sahara) and +590 (Saint Barthelemy, Saint Martin) have no
 *   hint: their ranges were not confirmed, so they fall to the main country.
 */
export const LEADING_DIGIT_HINTS: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "1": {
    CA: [
      "204", "226", "236", "249", "250", "257", "263", "289", "306", "343", "354", "365", "367",
      "368", "382", "403", "416", "418", "428", "431", "437", "438", "450", "468", "474", "506",
      "514", "519", "548", "579", "581", "584", "587", "604", "613", "639", "647", "672", "683",
      "705", "709", "742", "753", "778", "780", "782", "807", "819", "825", "867", "873", "879",
      "902", "905", "942",
    ],
    AG: ["268"],
    AI: ["264"],
    AS: ["684"],
    BB: ["246"],
    BM: ["441"],
    BS: ["242"],
    DM: ["767"],
    DO: ["809", "829", "849"],
    GD: ["473"],
    GU: ["671"],
    JM: ["876", "658"],
    KN: ["869"],
    KY: ["345"],
    LC: ["758"],
    MP: ["670"],
    MS: ["664"],
    PR: ["787", "939"],
    SX: ["721"],
    TC: ["649"],
    TT: ["868"],
    VC: ["784"],
    VG: ["284"],
    VI: ["340"],
  },
  "7": { KZ: ["6", "7"] },
  "39": { VA: ["06698"] },
  "44": { GG: ["1481"], JE: ["1534"], IM: ["1624"] },
  "47": { SJ: ["79"] },
  "61": { CC: ["89162"], CX: ["89164"] },
  "262": { YT: ["269", "639"] },
  "358": { AX: ["18"] },
  "599": { BQ: ["3", "4", "7"] },
};
