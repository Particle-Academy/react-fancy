// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties, ReactElement } from "react";
import { THEME_TOKENS } from "../src/theme-tokens";
import { ChatThread } from "../src/components/ChatThread";
import { JsonEditor } from "../src/components/JsonEditor/JsonEditor";
import { AA, mount, unmountAll } from "./contrast-assert";
import { contrast } from "./contrast-helper";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * The positive / accept fill is a theme token pair: `--fancy-success` (the fill)
 * and `--fancy-on-success` (the text on it), each with a `-dark` twin. Before,
 * ChatThread's proposal accept and JsonEditor's staged-edit accept were a fixed
 * `color="emerald"`, so a host palette could repaint everything around an
 * approval card except the one button that mattered.
 *
 * Defaults are the colours those buttons already painted (emerald-700 / white
 * in light, emerald-800 / white in dark), so setting nothing changes nothing.
 * Measured through the rendered CSS, like error-text-contrast.test.tsx.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

const proposalThread = () => (
  <ChatThread
    messages={[
      {
        id: "p1",
        role: "agent",
        content: "Set priority to high",
        createdAt: "2026-10-27T10:00:00",
        proposal: { id: "card-7", title: "Change priority" },
      },
    ]}
    onProposalAccept={() => {}}
    onProposalReject={() => {}}
  />
);

const stagedEdit = () => (
  <JsonEditor
    value={{ name: "Ada" }}
    pendingMode
    pending={[{ id: "p1", op: "set" as const, path: "name", value: "Grace" }]}
    onPendingChange={() => {}}
  />
);

type Case = [label: string, render: () => ReactElement, selector: string];

const CASES: Case[] = [
  ["ChatThread proposal accept", proposalThread, '[data-chat-proposal-action="accept"]'],
  ["JsonEditor staged-edit accept", stagedEdit, '[data-react-fancy-json-editor-accept][data-id="p1"]'],
];

function paint(el: Element) {
  const cs = getComputedStyle(el);
  return {
    fill: resolveVars(el, cs.getPropertyValue("background-color")),
    text: resolveVars(el, cs.getPropertyValue("color")),
  };
}

describe("the success token pairs", () => {
  it("are recorded in THEME_TOKENS with today's ChatThread accept colours", () => {
    expect(THEME_TOKENS.success).toMatchObject({
      variable: "--fancy-success",
      darkVariable: "--fancy-success-dark",
      light: "var(--color-emerald-700)",
      dark: "var(--color-emerald-800)",
    });
    expect(THEME_TOKENS["on-success"]).toMatchObject({
      variable: "--fancy-on-success",
      darkVariable: "--fancy-on-success-dark",
      light: "var(--color-white)",
      dark: "var(--color-white)",
    });
  });

  it("the light defaults clear 4.5:1", () => {
    const r = contrast(THEME_TOKENS["on-success"].light, THEME_TOKENS.success.light);
    expect(r, `light = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  it("the dark defaults clear 4.5:1", () => {
    const r = contrast(THEME_TOKENS["on-success"].dark, THEME_TOKENS.success.dark);
    expect(r, `dark = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });
});

describe.each(CASES)("%s", (label, view, selector) => {
  it("reads the success tokens, and by default paints what it painted before", async () => {
    const light = mount(<div>{view()}</div>).host;
    const dark = mount(<div className="dark">{view()}</div>).host;
    await installRenderedCss();
    const l = paint(light.querySelector(selector)!);
    const d = paint(dark.querySelector(selector)!);
    // Guard: the values really resolved, so the ratios are measured.
    for (const v of [l.fill, l.text, d.fill, d.text]) expect(v, label).toMatch(/^oklch\(|^#|^rgb/);
    expect(contrast(l.text, l.fill), `${label} light`).toBeGreaterThanOrEqual(AA);
    expect(contrast(d.text, d.fill), `${label} dark`).toBeGreaterThanOrEqual(AA);
    // The fill is the token's default, i.e. emerald-700 / emerald-800 as before.
    expect(l.fill).toBe(resolveVars(light, "var(--color-emerald-700)"));
    expect(d.fill).toBe(resolveVars(dark, "var(--color-emerald-800)"));
  });

  it("honours host-set values in each mode", async () => {
    const style = {
      "--fancy-success": "#1f6f43",
      "--fancy-success-dark": "#2b8a57",
      "--fancy-on-success": "#fffdf5",
      "--fancy-on-success-dark": "#f0fff4",
    } as CSSProperties;
    const light = mount(<div style={style}>{view()}</div>).host;
    const dark = mount(
      <div className="dark" style={style}>
        {view()}
      </div>,
    ).host;
    await installRenderedCss();
    expect(paint(light.querySelector(selector)!)).toEqual({ fill: "#1f6f43", text: "#fffdf5" });
    expect(paint(dark.querySelector(selector)!)).toEqual({ fill: "#2b8a57", text: "#f0fff4" });
  });
});

describe("ChatThread keeps its accept handle", () => {
  it('the accept button still carries data-chat-proposal-action="accept"', () => {
    const { host } = mount(proposalThread());
    const accept = host.querySelector('button[data-chat-proposal-action="accept"]');
    expect(accept).not.toBeNull();
    expect(accept!.textContent).toContain("Accept");
  });
});
