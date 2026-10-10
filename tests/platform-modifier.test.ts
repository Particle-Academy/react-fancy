import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  modifierKeyLabel,
  type FancyPlatform,
  type PlatformHints,
} from "../src/utils/platform";

const COMMAND = "⌘";

/**
 * A keyboard hint is a claim about the reader's hardware, and `⌘ + Enter` is a
 * FALSE one on Windows and Linux — it names a key that is not there. Reported
 * from a real Electron app on Linux, where the glyph had no font behind it and
 * rendered as a tofu box on top of being wrong.
 *
 * The shape of these tests matters as much as the assertions. The platform is
 * an ARGUMENT, so both branches are reachable from one machine — a function
 * that read `navigator` itself could only ever be tested on the OS the
 * developer is sitting at, which is exactly how a one-platform assumption ships.
 */
describe("modifierKeyLabel", () => {
  it("names Command only on Apple", () => {
    expect(modifierKeyLabel("apple")).toBe(COMMAND);
    expect(modifierKeyLabel("generic")).toBe("Ctrl");
  });

  it("cannot emit Command for any non-Apple platform", () => {
    // COUNTED over the whole domain, not spot-checked: adding a third platform
    // value without deciding its modifier fails here rather than shipping a
    // glyph nobody chose.
    const everyPlatform: FancyPlatform[] = ["apple", "generic"];
    const emitting = everyPlatform.filter((p) => modifierKeyLabel(p) === COMMAND);

    expect(emitting).toEqual(["apple"]);
  });

  it("is pressable whatever it says", () => {
    // The reason `generic` is the fallback rather than `apple`: submit accepts
    // `metaKey || ctrlKey`, so Ctrl is TRUE on a Mac while Command is false
    // everywhere else. An unknown platform must get the label that works.
    expect(modifierKeyLabel(detectPlatform(null))).toBe("Ctrl");
    expect(modifierKeyLabel(detectPlatform({}))).toBe("Ctrl");
  });
});

/** Real strings, so the table is evidence rather than a restatement of the regex. */
const CASES: Array<{ name: string; hints: PlatformHints; want: FancyPlatform }> = [
  {
    name: "macOS via userAgentData",
    hints: { userAgentData: { platform: "macOS" } },
    want: "apple",
  },
  {
    name: "Windows via userAgentData",
    hints: { userAgentData: { platform: "Windows" } },
    want: "generic",
  },
  {
    name: "Linux via userAgentData",
    hints: { userAgentData: { platform: "Linux" } },
    want: "generic",
  },
  {
    name: "Android via userAgentData",
    hints: { userAgentData: { platform: "Android" } },
    want: "generic",
  },
  { name: "iOS via userAgentData", hints: { userAgentData: { platform: "iOS" } }, want: "apple" },
  { name: "legacy MacIntel", hints: { platform: "MacIntel" }, want: "apple" },
  { name: "legacy Win32", hints: { platform: "Win32" }, want: "generic" },
  { name: "legacy Linux x86_64", hints: { platform: "Linux x86_64" }, want: "generic" },
  {
    name: "Electron on Linux",
    hints: {
      platform: "Linux x86_64",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) genie2/2.0.0 Chrome/130.0.0.0 Electron/33.0.0 Safari/537.36",
    },
    want: "generic",
  },
  {
    name: "iPhone, which says 'like Mac OS X'",
    hints: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    },
    want: "apple",
  },
  {
    name: "node/SSR — nothing to read",
    hints: {},
    want: "generic",
  },
];

describe("detectPlatform", () => {
  for (const c of CASES) {
    it(`reads ${c.name} as ${c.want}`, () => {
      expect(detectPlatform(c.hints)).toBe(c.want);
    });
  }

  it("does not let free text overturn an enumerated answer", () => {
    // The trap this guards: an Electron UA on Linux contains "AppleWebKit", and
    // a Windows machine can report a device model or font containing "Mac". A
    // substring sweep across every hint would call both Apple. When
    // `userAgentData` answers, it is final.
    expect(
      detectPlatform({
        userAgentData: { platform: "Linux" },
        platform: "MacIntel",
        userAgent: "Macintosh",
      }),
    ).toBe("generic");
  });

  it("ignores an empty userAgentData platform and falls through", () => {
    // Some runtimes expose the object with a blank platform. Treating "" as an
    // enumerated answer would pin every one of them to generic even on a Mac.
    expect(detectPlatform({ userAgentData: { platform: "" }, platform: "MacIntel" })).toBe("apple");
  });

  it("matches AppleWebKit only when the word is Apple's platform, not its engine", () => {
    // "AppleWebKit" is in nearly every UA string on earth, including Android's.
    expect(
      detectPlatform({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      }),
    ).toBe("generic");
  });
});
