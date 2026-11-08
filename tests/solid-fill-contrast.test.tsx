// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { COLORS } from "../src/utils/types";
import { Button } from "../src/components/Button";
import { Badge } from "../src/components/Badge";
import { ChatThread } from "../src/components/ChatThread";
import { ChatDrawer } from "../src/components/ChatDrawer";
import { Carousel } from "../src/components/Carousel";
import { Stepper } from "../src/components/Stepper";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import { AA, mount, unmountAll } from "./contrast-assert";
import { contrast, resolveColour } from "./contrast-helper";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * 6.19.1: white text on a 500-shade fill. axe flagged ChatThread's proposal
 * accept button (`Button color="emerald"`, white on emerald-500, 2.47:1), and
 * the same shape ran through the kit: the solid Button map put white on every
 * hue's 500 (and lightened to 500 on dark hover), Badge and MultiSwitch put it
 * on 600 / dark 500, and a few components hand-rolled it.
 *
 * Each fill is now the lightest shade of its own hue where white clears 4.5:1
 * (WCAG 1.4.3; button and badge labels are never large text), with the hover
 * one step darker. Measured through the rendered CSS: the consumer's Tailwind
 * is compiled for the classes in the document, the computed `color` and
 * `background-color` are resolved the way a browser would, and the oklch
 * values go through the kit's contrast helper. Hover is measured by forcing
 * the variant (see `installRenderedCss({ forceHover })`).
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

type Mode = "light" | "dark";
type State = "rest" | "hover";
const MODES: Mode[] = ["light", "dark"];
const STATES: State[] = ["rest", "hover"];
const MATRIX = MODES.flatMap((m) => STATES.map((s) => [m, s] as const));

/**
 * The palette hues. `brand` is left out: its fill and label are the host's
 * `--color-brand` / `--color-brand-contrast`, defined in the kit's styles.css
 * rather than Tailwind's theme, and its defaults (white on violet-600, hover
 * violet-700) are 5.89:1 and 7.30:1. Checked directly below.
 */
const HUES = COLORS.filter((c) => c !== "brand");

const TRANSPARENT =/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))?$/;

function computed(el: Element, prop: "color" | "background-color"): string {
  const raw = getComputedStyle(el).getPropertyValue(prop);
  return raw ? resolveVars(el, raw) : "";
}

/** The element's own computed text colour, resolved and checked to be a real colour. */
function textOf(el: Element): string {
  const c = computed(el, "color");
  expect(c, `computed color of <${el.tagName.toLowerCase()}>`).toMatch(/^(oklch\(|#)/);
  return c;
}

/** The nearest painted fill at or above `el`. */
function fillOf(el: Element): string {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const c = computed(n, "background-color");
    if (!TRANSPARENT.test(c)) {
      expect(c, `computed background of <${n.tagName.toLowerCase()}>`).toMatch(/^(oklch\(|#)/);
      return c;
    }
  }
  throw new Error("no painted fill above the element");
}

async function paint(view: ReactElement, mode: Mode, hover: (host: Element) => Element[] = () => []) {
  const { host } = mount(<div className={mode === "dark" ? "dark" : undefined}>{view}</div>);
  const hovered = hover(host);
  for (const el of hovered) el.setAttribute("data-force-hover", "");
  await installRenderedCss({ forceHover: hovered.length > 0 });
  return host;
}

type Pair = { label: string; text: Element; fill: Element | string };

function measure({ label, text, fill }: Pair) {
  const f = textOf(text);
  const b = typeof fill === "string" ? fill : fillOf(fill);
  return { label, f, b, r: contrast(f, b) };
}

/** Every pair clears AA; the message lists each failure with its ratio. */
function expectAll(pairs: Pair[]) {
  expect(pairs.length, "pairs measured").toBeGreaterThan(0);
  const failures = pairs
    .map(measure)
    .filter((m) => m.r < AA)
    .map((m) => `${m.label}: ${m.f} on ${m.b} = ${m.r.toFixed(2)}:1`);
  expect(failures, failures.join("\n")).toEqual([]);
}

const toHex = (rgb: [number, number, number]) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

/** White at `alpha` composited over `under`, in 8-bit sRGB, as a browser blends it. */
function whiteOver(under: string, alpha: number): string {
  const b = resolveColour(under);
  return toHex(b.map((v) => Math.round(255 * alpha + v * (1 - alpha))) as [number, number, number]);
}

describe("ChatThread proposal accept button", () => {
  const view = (
    <ChatThread
      messages={[
        { id: "m1", role: "assistant", content: "Proposal", proposal: { id: "p1", title: "Change priority" } },
      ]}
      onProposalAccept={() => {}}
      onProposalReject={() => {}}
    />
  );
  const accept = (h: Element) => h.querySelector("[data-chat-proposal-action=accept]")!;

  it.each(MATRIX)("%s, %s: white label >= 4.5:1 on its fill", async (mode, state) => {
    const host = await paint(view, mode, state === "hover" ? (h) => [accept(h)] : undefined);
    expect(accept(host), "accept button rendered").not.toBeNull();
    expectAll([{ label: "accept", text: accept(host), fill: accept(host) }]);
  });
});

describe("Button solid colours", () => {
  const view = (
    <div>
      {HUES.map((c) => (
        <Button key={c} color={c} data-c={c}>
          {c}
        </Button>
      ))}
    </div>
  );
  const buttons = (h: Element) => [...h.querySelectorAll("button[data-c]")];

  it.each(MATRIX)("%s, %s: every colour's label >= 4.5:1", async (mode, state) => {
    const host = await paint(view, mode, state === "hover" ? buttons : undefined);
    expect(buttons(host)).toHaveLength(HUES.length);
    expectAll(buttons(host).map((b) => ({ label: b.getAttribute("data-c")!, text: b, fill: b })));
  });
});

describe("Button active and checked states", () => {
  const view = (
    <div>
      <Button active data-s="active">
        Active
      </Button>
      <Button checked data-s="checked">
        Checked
      </Button>
    </div>
  );
  const buttons = (h: Element) => [...h.querySelectorAll("button[data-s]")];

  it.each(MATRIX)("%s, %s: label >= 4.5:1", async (mode, state) => {
    const host = await paint(view, mode, state === "hover" ? buttons : undefined);
    expect(buttons(host)).toHaveLength(2);
    expectAll(buttons(host).map((b) => ({ label: b.getAttribute("data-s")!, text: b, fill: b })));
  });
});

describe("Badge solid colours", () => {
  const view = (
    <div>
      {HUES.map((c) => (
        <Badge key={c} color={c} variant="solid" data-c={c}>
          {c}
        </Badge>
      ))}
    </div>
  );

  it.each(MODES)("%s: every colour's label >= 4.5:1", async (mode) => {
    const host = await paint(view, mode);
    const badges = [...host.querySelectorAll("[data-c]")];
    expect(badges).toHaveLength(HUES.length);
    expectAll(badges.map((b) => ({ label: b.getAttribute("data-c")!, text: b, fill: b })));
  });
});

describe("MultiSwitch selected label on its coloured thumb", () => {
  it.each(MODES)("%s: every colour >= 4.5:1", async (mode) => {
    const view = (
      <div>
        {HUES.map((c) => (
          <div key={c} data-c={c}>
            <MultiSwitch list={[{ value: "on", label: `${c} on`, color: c }, { value: "off", label: "off" }]} value="on" />
          </div>
        ))}
      </div>
    );
    const host = await paint(view, mode);
    const pairs = [...host.querySelectorAll("[data-c]")].map((wrap) => {
      const thumb = wrap.querySelector("[data-react-fancy-multi-switch-thumb]");
      const selected = wrap.querySelector('[role="radio"][aria-checked="true"]');
      expect(thumb, "thumb rendered").not.toBeNull();
      expect(selected, "selected radio rendered").not.toBeNull();
      return { label: wrap.getAttribute("data-c")!, text: selected!, fill: thumb! };
    });
    expect(pairs).toHaveLength(HUES.length);
    expectAll(pairs);
  });
});

describe("Stepper error indicator", () => {
  it.each(MODES)("%s: the '!' >= 4.5:1 on its red disc", async (mode) => {
    const host = await paint(
      <Stepper steps={[{ id: "a", title: "A" }, { id: "b", title: "B", state: "error" }]} />,
      mode,
    );
    const step = host.querySelector('[data-react-fancy-stepper-step][data-state="error"]');
    const indicator = step?.querySelector("[data-react-fancy-stepper-indicator]");
    expect(indicator, "error indicator rendered").toBeTruthy();
    expectAll([{ label: "error indicator", text: indicator!, fill: indicator! }]);
  });
});

describe("Carousel wizard Finish button", () => {
  const view = (
    <Carousel variant="wizard" onFinish={() => {}}>
      <Carousel.Panels>
        <Carousel.Slide>Only</Carousel.Slide>
      </Carousel.Panels>
      <Carousel.Controls finishLabel="Finish" />
    </Carousel>
  );
  const finish = (h: Element) => [...h.querySelectorAll("button")].find((b) => b.textContent === "Finish")!;

  it.each(MATRIX)("%s, %s: label >= 4.5:1", async (mode, state) => {
    const host = await paint(view, mode, state === "hover" ? (h) => [finish(h)] : undefined);
    expect(finish(host), "Finish rendered").toBeTruthy();
    expectAll([{ label: "Finish", text: finish(host), fill: finish(host) }]);
  });
});

describe("ChatDrawer active tab", () => {
  const view = (
    <ChatDrawer tabs={[{ id: "a", label: "Chat" }, { id: "b", label: "Notes" }]} activeTabId="a" onTabChange={() => {}} />
  );

  it.each(MODES)("%s: the label and the translucent number chip >= 4.5:1", async (mode) => {
    const host = await paint(view, mode);
    const tab = host.querySelector('button[aria-pressed="true"]')!;
    expect(tab, "active tab rendered").toBeTruthy();
    const label = [...tab.querySelectorAll("span")].find((s) => s.textContent === "Chat")!;
    const chip = [...tab.querySelectorAll("span")].find((s) => s.textContent === "1")!;
    // The chip is a translucent white over the tab; read its alpha off the class.
    const alpha = Number(chip.getAttribute("class")?.match(/(?:^|\s)bg-white\/(\d+)(?:\s|$)/)?.[1]);
    expect(alpha, "chip is bg-white/<n>").toBeGreaterThan(0);
    const tabFill = fillOf(tab);
    expectAll([
      { label: "tab label", text: label, fill: tab },
      { label: `number chip (white/${alpha} over the tab)`, text: chip, fill: whiteOver(tabFill, alpha / 100) },
    ]);
  });
});

describe("the brand defaults", () => {
  it("white on --color-brand and --color-brand-hover clears 4.5:1", () => {
    const css = readFileSync(path.resolve(__dirname, "../src/styles.css"), "utf8");
    // The declaration, not the usage examples in the comment above it.
    const def = (name: string) =>
      css.match(new RegExp(`^  --color-${name}:\\s*var\\(--color-([a-z]+-\\d+)\\);`, "m"))?.[1];
    const fill = def("brand");
    const hover = def("brand-hover");
    expect(fill, "--color-brand default found in styles.css").toBeTruthy();
    expect(hover, "--color-brand-hover default found in styles.css").toBeTruthy();
    for (const bg of [fill!, hover!]) {
      const r = contrast("white", bg);
      expect(r, `white on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });
});
