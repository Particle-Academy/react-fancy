/**
 * Country to dial code and national-number length, first party.
 *
 * LENGTHS ARE A SANITY CHECK, NOT VALIDATION. They catch a number that is
 * plainly too short or too long for its country. They do not know which ranges
 * are allocated, whether a number is mobile or fixed, or whether it is in
 * service. Exact validation belongs on a server (Twilio Lookup, for example).
 *
 * Each row: [ISO 3166-1 alpha-2, dial code, min, max, trunk prefixes?]
 *
 * - min / max count the NATIONAL SIGNIFICANT NUMBER (NSN): the digits after the
 *   country code, without a trunk prefix.
 * - trunk prefixes are what a person types before the NSN when dialling within
 *   the country. Omitted means "0". An empty list means the plan has none AND a
 *   leading 0 is part of the number (Italy), so it must not be dropped.
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
 * Except where a row says WIKI, the values were transcribed for this table and
 * NOT re-checked line by line against each plan when it was written. Treat a
 * row as a claim to correct, and correct it here with its source.
 *
 * Not listed, because they have no dial code of their own: AQ, BV, GS, HM,
 * PN, TF, UM. XK (Kosovo) is a user-assigned code, not ISO 3166-1, and is
 * listed because +383 is assigned to it and `Intl.DisplayNames` names it.
 */
export type CountryRow = readonly [
  code: string,
  dialCode: string,
  minLength: number,
  maxLength: number,
  trunkPrefixes?: readonly string[],
];

const NONE: readonly string[] = [];
const NANP_TRUNK: readonly string[] = ["1"];

export const COUNTRY_ROWS: readonly CountryRow[] = [
  ["AD", "376", 6, 9, NONE], // E164; NNP wide
  ["AE", "971", 8, 9], // E164; NNP
  ["AF", "93", 9, 9], // E164; NNP
  ["AG", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 268)
  ["AI", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 264)
  ["AL", "355", 6, 9], // E164; NNP wide
  ["AM", "374", 8, 8], // E164; NNP
  ["AO", "244", 9, 9, NONE], // E164; NNP
  ["AR", "54", 10, 11], // E164; NNP (mobile adds a 9 internationally)
  ["AS", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 684)
  ["AT", "43", 4, 13], // E164; NNP wide: open numbering plan
  ["AU", "61", 9, 9], // E164; NNP
  ["AW", "297", 7, 7, NONE], // E164; NNP
  ["AX", "358", 5, 12], // E164 (shared with FI, 358 18); NNP wide, as FI
  ["AZ", "994", 9, 9], // E164; NNP
  ["BA", "387", 8, 9], // E164; NNP
  ["BB", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 246)
  ["BD", "880", 6, 10], // E164; NNP wide: fixed lines vary
  ["BE", "32", 8, 9], // E164; NNP
  ["BF", "226", 8, 8, NONE], // E164; NNP
  ["BG", "359", 6, 9], // E164; NNP wide
  ["BH", "973", 8, 8, NONE], // E164; NNP
  ["BI", "257", 8, 8, NONE], // E164; NNP
  ["BJ", "229", 8, 10, NONE], // E164; WIKI: "01" prefixed to every number on 2024-11-30; wide, 8 kept for the old form
  ["BL", "590", 9, 9], // E164 (shared with GP, MF); NNP
  ["BM", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 441)
  ["BN", "673", 7, 7, NONE], // E164; NNP
  ["BO", "591", 8, 8], // E164; NNP
  ["BQ", "599", 7, 7, NONE], // E164 (shared with CW: 599 3, 4, 7); NNP
  ["BR", "55", 10, 11], // E164; NNP
  ["BS", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 242)
  ["BT", "975", 7, 8, NONE], // E164; NNP
  ["BW", "267", 7, 8, NONE], // E164; NNP
  ["BY", "375", 9, 9, ["80", "8"]], // E164; NNP (dialled 8 0XX nationally)
  ["BZ", "501", 7, 7, NONE], // E164; NNP
  ["CA", "1", 10, 10, NANP_TRUNK], // E164; NANPA
  ["CC", "61", 9, 9], // E164 (shared with AU, 61 89162); NNP, as AU
  ["CD", "243", 9, 9], // E164; NNP
  ["CF", "236", 8, 8, NONE], // E164; NNP
  ["CG", "242", 9, 9, NONE], // E164; NNP (the leading 0 is part of the number)
  ["CH", "41", 9, 9], // E164; NNP
  ["CI", "225", 10, 10, NONE], // E164; WIKI: 10 digits since 2021-01-31, leading 0 is part of the number
  ["CK", "682", 5, 5, NONE], // E164; NNP
  ["CL", "56", 9, 9], // E164; NNP
  ["CM", "237", 9, 9, NONE], // E164; NNP
  ["CN", "86", 5, 12], // E164; NNP wide: fixed lines vary by area code
  ["CO", "57", 10, 10], // E164; WIKI: fixed and mobile 10 digits since 2021
  ["CR", "506", 8, 8, NONE], // E164; NNP
  ["CU", "53", 6, 8], // E164; NNP wide
  ["CV", "238", 7, 7, NONE], // E164; NNP
  ["CW", "599", 7, 8, NONE], // E164 (shared with BQ: 599 9); NNP
  ["CX", "61", 9, 9], // E164 (shared with AU, 61 89164); NNP, as AU
  ["CY", "357", 8, 8, NONE], // E164; NNP
  ["CZ", "420", 9, 9, NONE], // E164; NNP
  ["DE", "49", 6, 13], // E164; NNP wide: open numbering plan
  ["DJ", "253", 8, 8, NONE], // E164; NNP
  ["DK", "45", 8, 8, NONE], // E164; NNP
  ["DM", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 767)
  ["DO", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 809, 829, 849)
  ["DZ", "213", 8, 9], // E164; NNP
  ["EC", "593", 8, 9], // E164; NNP
  ["EE", "372", 7, 8, NONE], // E164; NNP
  ["EG", "20", 8, 10], // E164; NNP wide
  ["EH", "212", 9, 9], // E164 (shared with MA); NNP, as MA
  ["ER", "291", 7, 7], // E164; NNP
  ["ES", "34", 9, 9, NONE], // E164; NNP
  ["ET", "251", 9, 9], // E164; NNP
  ["FI", "358", 5, 12], // E164; NNP wide: variable-length plan
  ["FJ", "679", 7, 7, NONE], // E164; NNP
  ["FK", "500", 5, 5, NONE], // E164; NNP
  ["FM", "691", 7, 7, NONE], // E164; NNP
  ["FO", "298", 6, 6, NONE], // E164; NNP
  ["FR", "33", 9, 9], // E164; NNP
  ["GA", "241", 7, 8, NONE], // E164; WIKI: 7 digits, 8 for mobiles renumbered in 2019; the 0 is part of the number
  ["GB", "44", 7, 10], // E164; NNP (10 for almost all; a few 9 and 7)
  ["GD", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 473)
  ["GE", "995", 9, 9], // E164; NNP
  ["GF", "594", 9, 9], // E164; NNP
  ["GG", "44", 10, 10], // E164 (shared with GB, 44 1481); NNP, as GB
  ["GH", "233", 9, 9], // E164; NNP
  ["GI", "350", 8, 8, NONE], // E164; NNP
  ["GL", "299", 6, 6, NONE], // E164; NNP
  ["GM", "220", 7, 7, NONE], // E164; NNP
  ["GN", "224", 8, 9, NONE], // E164; NNP wide
  ["GP", "590", 9, 9], // E164 (shared with BL, MF); NNP
  ["GQ", "240", 9, 9, NONE], // E164; NNP
  ["GR", "30", 10, 10, NONE], // E164; NNP
  ["GT", "502", 8, 8, NONE], // E164; NNP
  ["GU", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 671)
  ["GW", "245", 7, 9, NONE], // E164; NNP wide
  ["GY", "592", 7, 7, NONE], // E164; NNP
  ["HK", "852", 8, 8, NONE], // E164; NNP
  ["HN", "504", 8, 8, NONE], // E164; NNP
  ["HR", "385", 7, 9], // E164; NNP wide
  ["HT", "509", 8, 8, NONE], // E164; NNP
  ["HU", "36", 8, 9, ["06"]], // E164; NNP (trunk prefix 06)
  ["ID", "62", 7, 12], // E164; NNP wide
  ["IE", "353", 7, 9], // E164; NNP
  ["IL", "972", 8, 9], // E164; NNP
  ["IM", "44", 10, 10], // E164 (shared with GB, 44 1624); NNP, as GB
  ["IN", "91", 10, 10], // E164; NNP
  ["IO", "246", 7, 7, NONE], // E164; NNP
  ["IQ", "964", 8, 10], // E164; NNP wide
  ["IR", "98", 10, 10], // E164; NNP
  ["IS", "354", 7, 9, NONE], // E164; NNP
  ["IT", "39", 6, 11, NONE], // E164; NNP wide (the leading 0 of a fixed line is part of the number)
  ["JE", "44", 10, 10], // E164 (shared with GB, 44 1534); NNP, as GB
  ["JM", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 876, 658)
  ["JO", "962", 8, 9], // E164; NNP
  ["JP", "81", 9, 10], // E164; NNP
  ["KE", "254", 7, 10], // E164; NNP wide
  ["KG", "996", 9, 9], // E164; NNP
  ["KH", "855", 8, 9], // E164; NNP
  ["KI", "686", 5, 8, NONE], // E164; NNP wide
  ["KM", "269", 7, 7, NONE], // E164; NNP
  ["KN", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 869)
  ["KP", "850", 6, 12], // E164; NNP wide: not confirmed
  ["KR", "82", 8, 11], // E164; NNP wide
  ["KW", "965", 8, 8, NONE], // E164; NNP
  ["KY", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 345)
  ["KZ", "7", 10, 10, ["8"]], // E164 (shared with RU: 7 6, 7 7); WIKI: zones 6xx and 7xx
  ["LA", "856", 8, 10], // E164; NNP wide
  ["LB", "961", 7, 8], // E164; NNP
  ["LC", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 758)
  ["LI", "423", 7, 9, NONE], // E164; NNP
  ["LK", "94", 9, 9], // E164; NNP
  ["LR", "231", 7, 9], // E164; NNP wide
  ["LS", "266", 8, 8, NONE], // E164; NNP
  ["LT", "370", 8, 8, ["0", "8"]], // E164; WIKI: trunk 0 since 2024-03-01, the old 8 still read
  ["LU", "352", 4, 11, NONE], // E164; NNP wide: open numbering plan
  ["LV", "371", 8, 8, NONE], // E164; NNP
  ["LY", "218", 8, 9], // E164; NNP
  ["MA", "212", 9, 9], // E164; NNP
  ["MC", "377", 8, 9, NONE], // E164; NNP
  ["MD", "373", 8, 8], // E164; NNP
  ["ME", "382", 8, 8], // E164; NNP
  ["MF", "590", 9, 9], // E164 (shared with GP, BL); NNP
  ["MG", "261", 9, 9], // E164; NNP
  ["MH", "692", 7, 7, NONE], // E164; NNP
  ["MK", "389", 8, 8], // E164; NNP
  ["ML", "223", 8, 8, NONE], // E164; NNP
  ["MM", "95", 7, 10], // E164; WIKI: 8 to 11 digits with the trunk 0, so 7 to 10; mobiles 8 to 10
  ["MN", "976", 8, 8], // E164; NNP
  ["MO", "853", 8, 8, NONE], // E164; NNP
  ["MP", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 670)
  ["MQ", "596", 9, 9], // E164; NNP
  ["MR", "222", 8, 8, NONE], // E164; NNP
  ["MS", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 664)
  ["MT", "356", 8, 8, NONE], // E164; NNP
  ["MU", "230", 7, 8, NONE], // E164; NNP
  ["MV", "960", 7, 7, NONE], // E164; NNP
  ["MW", "265", 7, 9], // E164; NNP wide
  ["MX", "52", 10, 10], // E164; NNP (10 digits since 2019)
  ["MY", "60", 8, 10], // E164; NNP
  ["MZ", "258", 8, 9, NONE], // E164; NNP
  ["NA", "264", 7, 9], // E164; NNP wide
  ["NC", "687", 6, 6, NONE], // E164; NNP
  ["NE", "227", 8, 8, NONE], // E164; NNP
  ["NF", "672", 6, 6, NONE], // E164 (672 3); NNP
  ["NG", "234", 7, 10], // E164; NNP wide
  ["NI", "505", 8, 8, NONE], // E164; NNP
  ["NL", "31", 9, 9], // E164; NNP
  ["NO", "47", 5, 8, NONE], // E164; NNP (8, with a few 5-digit service numbers)
  ["NP", "977", 8, 10], // E164; NNP wide
  ["NR", "674", 7, 7, NONE], // E164; NNP
  ["NU", "683", 4, 7, NONE], // E164; NNP wide
  ["NZ", "64", 8, 10], // E164; NNP
  ["OM", "968", 8, 8, NONE], // E164; NNP
  ["PA", "507", 7, 8, NONE], // E164; NNP
  ["PE", "51", 8, 9], // E164; NNP
  ["PF", "689", 6, 8, NONE], // E164; NNP wide (8 since 2017)
  ["PG", "675", 7, 8, NONE], // E164; NNP
  ["PH", "63", 8, 10], // E164; NNP
  ["PK", "92", 8, 10], // E164; NNP wide
  ["PL", "48", 9, 9, NONE], // E164; NNP
  ["PM", "508", 6, 6], // E164; NNP
  ["PR", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 787, 939)
  ["PS", "970", 8, 9], // E164; NNP
  ["PT", "351", 9, 9, NONE], // E164; NNP
  ["PW", "680", 7, 7, NONE], // E164; NNP
  ["PY", "595", 7, 9], // E164; NNP wide
  ["QA", "974", 7, 8, NONE], // E164; NNP
  ["RE", "262", 9, 9], // E164 (shared with YT); NNP
  ["RO", "40", 9, 9], // E164; NNP
  ["RS", "381", 6, 9], // E164; NNP wide
  ["RU", "7", 10, 10, ["8"]], // E164 (shared with KZ); NNP (trunk prefix 8)
  ["RW", "250", 9, 9], // E164; NNP
  ["SA", "966", 8, 9], // E164; NNP
  ["SB", "677", 5, 7, NONE], // E164; NNP wide
  ["SC", "248", 7, 7, NONE], // E164; NNP
  ["SD", "249", 9, 9], // E164; NNP
  ["SE", "46", 6, 10], // E164; NNP wide: variable-length plan
  ["SG", "65", 8, 8, NONE], // E164; NNP
  ["SH", "290", 5, 5, NONE], // E164; WIKI: fixed five-digit plan since 2013-10-01
  ["SI", "386", 8, 8], // E164; NNP
  ["SJ", "47", 8, 8, NONE], // E164 (shared with NO, 47 79); NNP, as NO
  ["SK", "421", 9, 9], // E164; NNP
  ["SL", "232", 8, 8], // E164; NNP
  ["SM", "378", 6, 10, NONE], // E164; NNP wide
  ["SN", "221", 9, 9, NONE], // E164; NNP
  ["SO", "252", 7, 9], // E164; NNP wide
  ["SR", "597", 6, 7, NONE], // E164; NNP
  ["SS", "211", 9, 9], // E164; NNP
  ["ST", "239", 7, 7, NONE], // E164; NNP
  ["SV", "503", 8, 8, NONE], // E164; NNP
  ["SX", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 721)
  ["SY", "963", 7, 9], // E164; NNP wide
  ["SZ", "268", 8, 8, NONE], // E164; NNP
  ["TC", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 649)
  ["TD", "235", 8, 8, NONE], // E164; NNP
  ["TG", "228", 8, 8, NONE], // E164; NNP
  ["TH", "66", 8, 9], // E164; NNP
  ["TJ", "992", 9, 9], // E164; NNP
  ["TK", "690", 4, 7, NONE], // E164; NNP wide
  ["TL", "670", 7, 8, NONE], // E164; NNP
  ["TM", "993", 8, 8], // E164; NNP
  ["TN", "216", 8, 8, NONE], // E164; NNP
  ["TO", "676", 5, 7, NONE], // E164; NNP wide
  ["TR", "90", 10, 10], // E164; NNP
  ["TT", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 868)
  ["TV", "688", 5, 6, NONE], // E164; NNP
  ["TW", "886", 7, 9], // E164; NNP wide
  ["TZ", "255", 9, 9], // E164; NNP
  ["UA", "380", 9, 9], // E164; NNP
  ["UG", "256", 9, 9], // E164; NNP
  ["US", "1", 10, 10, NANP_TRUNK], // E164; NANPA
  ["UY", "598", 8, 8], // E164; NNP
  ["UZ", "998", 9, 9], // E164; NNP
  ["VA", "39", 6, 11, NONE], // E164 (shared with IT, 39 06698); NNP, as IT
  ["VC", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 784)
  ["VE", "58", 10, 10], // E164; NNP
  ["VG", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 284)
  ["VI", "1", 10, 10, NANP_TRUNK], // E164; NANPA (NPA 340)
  ["VN", "84", 8, 10], // E164; NNP wide
  ["VU", "678", 5, 7, NONE], // E164; NNP wide
  ["WF", "681", 6, 6, NONE], // E164; NNP
  ["WS", "685", 5, 7, NONE], // E164; NNP wide
  ["XK", "383", 8, 9], // E164; NNP
  ["YE", "967", 7, 9], // E164; NNP wide
  ["YT", "262", 9, 9], // E164 (shared with RE: 262 269, 639); WIKI
  ["ZA", "27", 9, 9], // E164; NNP
  ["ZM", "260", 9, 9], // E164; NNP
  ["ZW", "263", 5, 10], // E164; NNP wide: fixed lines vary
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
