// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { Autocomplete } from "../src/components/Autocomplete/Autocomplete";
import { Select } from "../src/components/inputs/Select/Select";
import { Command } from "../src/components/Command";
import { EmojiSelect } from "../src/components/EmojiSelect/EmojiSelect";
import { Chart } from "../src/components/Chart";
import { InputTag, type InputTagAdapter, type InputTagAdapterState } from "../src/components/InputTag";
import { PromptInput } from "../src/components/PromptInput/PromptInput";
import { cls, expectContrast, expectControl, expectText, fg, mount, surface, unmountAll, AA } from "./contrast-assert";

/**
 * Default contrast of the secondary text inside popups and overlays: list
 * empty / loading states, group headings, chart tooltips, picker headers and
 * the hint rows under them. Many of these sit on a TINTED surface (a zinc-50 or
 * zinc-950 header strip, a violet-100 active row, a zinc-100 chip), which is
 * where the kit's muted token runs out of room: zinc-500 is 4.83:1 on white but
 * 4.39:1 on zinc-100 and about 4.1:1 on violet-100. Those rows use `subtle`.
 * Measured for an app that sets no `--fancy-*` variable (6.12.0).
 */

beforeEach(() => {
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn();
});
afterEach(() => {
  unmountAll();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function click(el: Element | null) {
  act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  act(() => {
    set.call(el, text);
    el.setSelectionRange(text.length, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const byText = (root: ParentNode, text: string, sel = "*") =>
  [...root.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim() === text && e.children.length === 0) ??
  null;

describe("list popups: empty and loading states", () => {
  it("Autocomplete 'Loading...' and the empty message", () => {
    const { host } = mount(<Autocomplete options={[]} loading value="" onChange={() => {}} />);
    act(() => host.querySelector("input")!.focus());
    typeInto(host.querySelector("input")!, "a");
    const loading = byText(document, "Loading...");
    expect(loading).not.toBeNull();
    expectText("Autocomplete loading", loading);
    unmountAll();

    const { host: h2 } = mount(<Autocomplete options={[]} emptyMessage="Nothing here" value="" onChange={() => {}} />);
    act(() => h2.querySelector("input")!.focus());
    typeInto(h2.querySelector("input")!, "zz");
    const empty = byText(document, "Nothing here");
    expect(empty).not.toBeNull();
    expectText("Autocomplete empty", empty);
  });

  it("Select: 'No results found' and the trigger chevron", () => {
    const { host } = mount(<Select variant="listbox" searchable list={["Apple", "Banana"]} />);
    const trigger = host.querySelector("button")!;
    expectControl("Select chevron", trigger.querySelector("svg"), surface(trigger, { light: "white", dark: "#1e1e24" }));
    click(trigger);
    const search = document.querySelector<HTMLInputElement>('[role="listbox"] input')!;
    typeInto(search, "zzz");
    const none = byText(document, "No results found");
    expect(none).not.toBeNull();
    expectText("Select no results", none);
  });
});

describe("Command palette", () => {
  it("group heading, search icon (decorative) and input placeholder", () => {
    mount(
      <Command open onClose={() => {}}>
        <Command.Input placeholder="Search" />
        <Command.List>
          <Command.Group heading="Projects">
            <Command.Item>tynn</Command.Item>
          </Command.Group>
        </Command.List>
      </Command>,
    );
    const heading = byText(document, "Projects");
    expectText("Command group heading", heading);
    const input = document.querySelector("[data-react-fancy-command-input] input");
    expectContrast("Command placeholder", fg(input, "placeholder"), surface(input), AA);
    const icon = document.querySelector("[data-react-fancy-command-input] svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("EmojiSelect", () => {
  it("the 'Pick emoji' prompt and the category heading", () => {
    const { host } = mount(<EmojiSelect />);
    const prompt = byText(host, "Pick emoji");
    // The trigger has no light fill (the page shows through) and the input
    // token's dark fill.
    expectText("EmojiSelect prompt", prompt, { light: "white", dark: "#1e1e24" });
    click(host.querySelector("button"));
    const heading = [...document.querySelectorAll<HTMLElement>("div")].find((d) =>
      cls(d).includes("uppercase"),
    );
    expect(heading).toBeTruthy();
    expectText("EmojiSelect category heading", heading);
  });
});

describe("chart tooltips and value labels (on the tooltip's own surface)", () => {
  function hover(svgHost: Element) {
    const target = svgHost.querySelector("[data-react-fancy-chart], div") ?? svgHost;
    act(() => {
      for (const el of [svgHost, ...svgHost.querySelectorAll("*")]) {
        el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 10, clientY: 10 }));
      }
      // StackedBar listens with onMouseEnter, which React derives from mouseover.
      const bar = svgHost.querySelector("rect");
      if (bar) {
        bar.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
      }
    });
    return target;
  }

  it("Line tooltip series label", () => {
    const { host } = mount(<Chart.Line labels={["a", "b"]} series={[{ label: "Visits", data: [1, 2] }]} animate={false} />);
    hover(host);
    const label = byText(host, "Visits:");
    expect(label).not.toBeNull();
    expectText("Line tooltip label", label);
  });

  it("StackedBar tooltip series label and total line", () => {
    const { host } = mount(
      <Chart.StackedBar labels={["Q1", "Q2"]} series={[{ label: "North", data: [1, 2] }]} animate={false} />,
    );
    hover(host);
    const label = byText(host, "North:");
    expect(label).not.toBeNull();
    expectText("StackedBar tooltip label", label);
    const total = [...host.querySelectorAll("div")].find((d) => d.textContent?.startsWith("Total:"));
    expectText("StackedBar total", total);
  });

  it("HorizontalBar value labels", () => {
    const { host } = mount(<Chart.HorizontalBar data={[{ label: "A", value: 42 }]} showValues animate={false} />);
    const v = byText(host, "42", "span");
    expect(v).not.toBeNull();
    expectText("HorizontalBar value", v);
  });
});

describe("InputTag popup header (zinc-50 / zinc-950 strip)", () => {
  it("label and query echo", () => {
    let push: (s: InputTagAdapterState) => void = () => {};
    const adapter: InputTagAdapter = {
      subscribe: (fn) => {
        push = fn;
        return () => {};
      },
      replaceRange: () => {},
      getAnchorRect: () => ({ left: 0, right: 300, top: 0, bottom: 30, width: 300, height: 30, x: 0, y: 0, toJSON() {} }) as DOMRect,
      onKey: () => () => {},
    };
    mount(
      <InputTag
        adapter={adapter}
        triggers={{
          "/": {
            label: "Commands",
            items: [{ name: "/a" }],
            keyOf: (i: { name: string }) => i.name,
            render: (i: { name: string }) => i.name,
            insert: (i: { name: string }) => i.name,
            filter: () => true,
          },
        }}
      />,
    );
    act(() => push({ text: "/a", caretIndex: 2 }));
    const label = byText(document, "Commands");
    expect(label).not.toBeNull();
    expectText("InputTag header", label);
    const echo = [...document.querySelectorAll<HTMLElement>("span")].find((s) => cls(s).includes("font-mono"));
    expectText("InputTag query echo", echo);
  });
});

describe("PromptInput", () => {
  function textarea(host: HTMLElement) {
    return host.querySelector<HTMLTextAreaElement>("[data-react-fancy-prompt-input-textarea]")!;
  }

  it("placeholder and the send-shortcut hint", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} placeholder="Ask" onSubmit={() => {}} />);
    const ta = textarea(host);
    expectContrast("PromptInput placeholder", fg(ta, "placeholder"), surface(ta), AA);
    const hint = host.querySelector("[data-react-fancy-prompt-input-hint]");
    expect(hint).not.toBeNull();
    expectText("PromptInput send hint", hint);
  });

  it("command picker: header strip and the hint under each row, active row included", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} commands={[{ name: "/plan", hint: "Make a plan" }]} onSubmit={() => {}} />,
    );
    typeInto(textarea(host), "/");
    const menu = host.querySelector("[data-react-fancy-prompt-input-menu]")!;
    const header = menu.firstElementChild;
    expectText("PromptInput picker header", header);
    const hint = byText(menu, "Make a plan");
    const row = hint!.closest("[data-react-fancy-prompt-input-menu-item]")!;
    expect(row.getAttribute("aria-selected")).toBe("true");
    // The active row is violet-100 (light) over the menu; in dark it is a 30%
    // violet-900 wash over zinc-900, which is darker than zinc-800.
    expectText("PromptInput command hint, active row", hint, { light: "violet-100", dark: "zinc-800" });
    expectText("PromptInput command hint, hovered row", hint, { light: "zinc-50", dark: "zinc-800" });
  });

  it("mention picker: the kind label, active row included", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} mentions={[{ id: "a", name: "Ada", kind: "user" }]} onSubmit={() => {}} />,
    );
    typeInto(textarea(host), "@");
    const kind = host.querySelector('[data-react-fancy-prompt-input-menu] [title="user"]');
    expect(kind).not.toBeNull();
    expectText("PromptInput mention kind, active row", kind, { light: "violet-100", dark: "zinc-800" });
  });

  it("attachment chip: the size (on the zinc-100 chip) and a decorative paperclip", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);
    const f = new File(["x"], "notes.pdf", { type: "application/pdf" });
    Object.defineProperty(f, "size", { value: 2048 });
    const zone = host.querySelector("[data-react-fancy-prompt-input]") ?? host.firstElementChild!;
    const ev = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", { value: { files: [f], types: ["Files"] } });
    act(() => {
      zone.dispatchEvent(ev);
    });
    const chip = host.querySelector("[data-react-fancy-prompt-input-attachment]");
    expect(chip).not.toBeNull();
    const size = [...chip!.querySelectorAll("span")].find((s) => /KB|B$/.test(s.textContent ?? ""));
    expectText("PromptInput attachment size", size);
    expect(chip!.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
