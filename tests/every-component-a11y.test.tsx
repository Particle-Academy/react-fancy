// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { StickyNote } from "../src/components/StickyNote";
import { ColorPicker } from "../src/components/ColorPicker";
import { PhoneInput } from "../src/components/PhoneInput";
import { ImageViewer } from "../src/components/ImageViewer";
import { MediaViewer } from "../src/components/MediaViewer";
import { NotificationBell } from "../src/components/NotificationBell";
import { Kanban } from "../src/components/Kanban";
import { ImagePill } from "../src/components/ImagePill";
import { CodeView } from "../src/components/CodeView";
import { PdfViewer } from "../src/components/PdfViewer";
import { FauxClient } from "../src/components/FauxClient";
import { contrast, defaultColourOf } from "./contrast-helper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The react-fancy findings of the lab's every-component brief (fancy-labs
 * `docs/kit-site-findings.md`, K22 to K27, test 81, run 601). Each one was an
 * axe violation (or a failed request) in the component's OWN markup, with the
 * host passing nothing unusual. These assert the structure axe checks, since
 * jsdom has no layout for axe itself to run on.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.innerHTML = "";
});

/** The accessible name, the way it is computed for these elements. */
function nameOf(el: Element): string {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  }
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  const id = el.getAttribute("id");
  if (id) {
    const explicit = document.querySelector(`label[for="${id}"]`);
    if (explicit) return explicit.textContent?.trim() ?? "";
  }
  return el.getAttribute("title")?.trim() ?? "";
}

/**
 * axe 4.14's `label-content-name-mismatch` comparison: text in parentheses is
 * dropped, emoji and punctuation become spaces, and the VISIBLE words must
 * appear, in order and contiguously, among the name's words. Visible text
 * includes `aria-hidden` text: axe reads what is on screen, not the tree.
 */
function words(text: string): string[] {
  let s = text.normalize("NFKD");
  for (let prev = ""; prev !== s; ) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, "");
  }
  return s
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}/gu, " ")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function expectLabelInName(el: Element) {
  const visible = words(el.textContent ?? "");
  const name = words(nameOf(el));
  const found =
    visible.length === 0 ||
    name.some((_, i) => visible.every((w, j) => name[i + j] === w));
  expect(found, `visible text ${JSON.stringify(visible)} is not in the accessible name ${JSON.stringify(name)}`).toBe(true);
}

/** An interactive ancestor of `el` (excluding `el`). */
function interactiveAncestor(el: Element): Element | null {
  return el.parentElement?.closest("button, a[href], input, select, textarea, [role=button], [role=link], [tabindex]") ?? null;
}

describe("K22 StickyNote: its editable text has a name", () => {
  const box = (host: Element) => host.querySelector<HTMLElement>("[role=textbox]")!;

  it("has a default name", () => {
    const host = mount(<StickyNote value="Call the accountant on Friday" />);
    expect(nameOf(box(host))).not.toBe("");
  });

  it("takes its name from `label`", () => {
    const host = mount(<StickyNote value="x" label="Reminder" />);
    expect(nameOf(box(host))).toBe("Reminder");
  });
});

describe("K23 ColorPicker: the input is named and not nested in another control", () => {
  const input = (host: Element) => host.querySelector<HTMLInputElement>("input[type=color]")!;

  it("is not inside a button (nested-interactive)", () => {
    const host = mount(<ColorPicker value="#0f766e" />);
    expect(interactiveAncestor(input(host))).toBeNull();
    expect(host.querySelector("[data-react-fancy-color-picker] button")).toBeNull();
  });

  it("has a default name", () => {
    const host = mount(<ColorPicker value="#0f766e" />);
    expect(nameOf(input(host))).not.toBe("");
  });

  it("an aria-label on the root names the input", () => {
    const host = mount(<ColorPicker value="#0f766e" aria-label="Brand colour" />);
    expect(nameOf(input(host))).toBe("Brand colour");
    expect(host.querySelector("[data-react-fancy-color-picker]")!.hasAttribute("aria-label")).toBe(false);
  });

  it("aria-labelledby on the root reaches the input", () => {
    const host = mount(
      <>
        <span id="cp-label">Accent</span>
        <ColorPicker value="#0f766e" aria-labelledby="cp-label" />
      </>,
    );
    expect(nameOf(input(host))).toBe("Accent");
  });

  it("the input is the tab stop", () => {
    const host = mount(<ColorPicker value="#0f766e" />);
    expect(input(host).tabIndex).toBe(0);
    expect(input(host).getAttribute("tabindex")).toBeNull();
  });
});

describe("K24 visible text is part of the accessible name (label-content-name-mismatch)", () => {
  it("PhoneInput's country button", () => {
    const host = mount(<PhoneInput label="Phone" defaultCountry="US" value={null} onValueChange={() => {}} />);
    const button = host.querySelector("[data-react-fancy-phone-input-country]")!;
    expect(button.textContent).toContain("+1");
    expectLabelInName(button);
  });

  /** The zoom controls show once the image has loaded. */
  const loaded = (host: Element) => {
    act(() => {
      host.querySelector("img")!.dispatchEvent(new Event("load"));
    });
    return host;
  };

  it("ImageViewer's zoom controls", () => {
    const host = loaded(mount(<ImageViewer src="data:image/png;base64,iVBORw0KGgo=" alt="A sample tile" />));
    const buttons = host.querySelectorAll("[data-react-fancy-image-viewer-controls] button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(expectLabelInName);
    const reset = Array.from(buttons).find((b) => b.textContent?.includes("%"))!;
    expect(nameOf(reset)).toMatch(/reset zoom/i);
  });

  it("MediaViewer's image viewer", () => {
    const host = loaded(mount(<MediaViewer src="/media/kit-sample.png" alt="A sample tile" kind="image" />));
    const buttons = host.querySelectorAll("[data-react-fancy-image-viewer-controls] button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach(expectLabelInName);
  });

  it("the same reset-zoom button on FauxClient and on PdfViewer's page mode", () => {
    const host = mount(
      <>
        <FauxClient controls zoom={1.5}>
          <p>content</p>
        </FauxClient>
        <PdfViewer pages={{ count: 2, url: (n) => `/p/${n}.png` }} />
      </>,
    );
    const resets = host.querySelectorAll("[data-react-fancy-faux-client-zoom-reset], [data-react-fancy-pdf-viewer-zoom-reset]");
    expect(resets.length).toBe(2);
    resets.forEach((b) => {
      expect(b.textContent).toMatch(/\d+%/);
      expectLabelInName(b);
    });
  });

  it("NotificationBell, with its count, an overflowed count and none", () => {
    for (const [count, shown] of [
      [3, "3"],
      [250, "99+"],
      [0, ""],
    ] as const) {
      const host = mount(<NotificationBell count={count} />);
      const bell = host.querySelector("[data-react-fancy-notification-bell]")!;
      expect(bell.textContent).toBe(shown);
      expectLabelInName(bell);
      expect(nameOf(bell)).toMatch(/^Notifications/);
    }
  });
});

describe("K25 Kanban: the scrolling board is reachable from the keyboard", () => {
  const board = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-kanban]")!;
  const render = (props: { label?: string } = {}) =>
    mount(
      <Kanban {...props}>
        <Kanban.Column id="todo" title="To do">
          <Kanban.Card id="t1">Send invoice 1003</Kanban.Card>
        </Kanban.Column>
      </Kanban>,
    );

  it("is focusable, so its overflow can be scrolled (scrollable-region-focusable)", () => {
    const el = board(render());
    expect(el.className).toMatch(/overflow-x-auto/);
    expect(el.tabIndex).toBe(0);
    el.focus();
    expect(document.activeElement).toBe(el);
  });

  it("is a named region with a visible focus ring", () => {
    const el = board(render());
    expect(el.getAttribute("role")).toBe("region");
    expect(nameOf(el)).toBe("Kanban board");
    expect(el.className).toMatch(/focus-visible:ring-2/);
  });

  it("takes its name from `label`", () => {
    expect(nameOf(board(render({ label: "Sprint 12" })))).toBe("Sprint 12");
  });
});

describe("K26 ImagePill contrast and CodeView's name", () => {
  it("the pill's text reaches 4.5:1 on its fill (light)", () => {
    const host = mount(<ImagePill label="receipt.png" src="/media/kit-sample.png" />);
    const cls = host.querySelector("[data-react-fancy-image-pill]")!.getAttribute("class")!;
    const fg = defaultColourOf(cls, "")!;
    const bg = defaultColourOf(cls, "", "bg")!;
    const r = contrast(fg, bg);
    expect(r, `${fg} on ${bg} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("the pill's text reaches 4.5:1 in dark mode, on the darkest surface under its tint", () => {
    const host = mount(<ImagePill label="receipt.png" src="/media/kit-sample.png" />);
    const cls = host.querySelector("[data-react-fancy-image-pill]")!.getAttribute("class")!;
    const fg = defaultColourOf(cls, "dark:")!;
    const r = contrast(fg, "zinc-900");
    expect(r, `${fg} on zinc-900 = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  const textarea = (host: Element) => host.querySelector<HTMLTextAreaElement>("textarea")!;

  it("CodeView's textarea has a default name", () => {
    const host = mount(<CodeView value={'{"plan": "solo"}'} language="json" readOnly />);
    expect(nameOf(textarea(host))).not.toBe("");
  });

  it("CodeView takes its name from `label`", () => {
    const host = mount(<CodeView value="x" label="composer.json" />);
    expect(nameOf(textarea(host))).toBe("composer.json");
  });
});

describe("K27 PdfViewer: one request for the PDF, none aborted", () => {
  it("embeds the PDF once, with no fallback iframe of the same URL", () => {
    const host = mount(<PdfViewer src="/media/kit-sample.pdf" title="Sample invoice" />);
    // An <iframe> inside the <object> loads the same URL a second time; in a
    // browser without a PDF viewer it turns into a download that is cancelled
    // (net::ERR_ABORTED), and with one the PDF is fetched twice.
    expect(host.querySelector("iframe")).toBeNull();
    const loaders = host.querySelectorAll("object[data], iframe[src], embed[src]");
    expect(loaders.length).toBe(1);
    const object = host.querySelector("object")!;
    expect(object.getAttribute("data")).toBe("/media/kit-sample.pdf");
    expect(nameOf(object)).toBe("Sample invoice");
  });

  it("keeps the download link as the fallback", () => {
    const host = mount(<PdfViewer src="/media/kit-sample.pdf" title="Sample invoice" />);
    const link = host.querySelector<HTMLAnchorElement>("object a[download]")!;
    expect(link.getAttribute("href")).toBe("/media/kit-sample.pdf");
  });
});
