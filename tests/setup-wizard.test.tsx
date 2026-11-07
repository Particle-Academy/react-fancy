// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SetupWizard } from "../src/components/SetupWizard";
import type { SetupWizardProps, SetupWizardStep, SetupWizardValue } from "../src/components/SetupWizard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return { host, rerender: (next: ReactElement) => act(() => root!.render(next)) };
}

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

beforeEach(() => setClipboard(undefined));

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

/** A parent that owns the value, as a real app would. */
function Harness(props: Omit<SetupWizardProps, "value" | "onChange"> & {
  initial?: SetupWizardValue;
  spy?: (next: SetupWizardValue) => void;
}) {
  const { initial = { current: 0, done: [] }, spy, ...rest } = props;
  const [value, setValue] = useState<SetupWizardValue>(initial);
  return (
    <SetupWizard
      {...rest}
      value={value}
      onChange={(next) => {
        spy?.(next);
        setValue(next);
      }}
    />
  );
}

const STEPS: SetupWizardStep[] = [
  { id: "account", title: "Create an account", detail: "Sign up at the provider.", url: "https://dashboard.example.com/signup" },
  { id: "key", title: "Copy your key", detail: "Open Settings.", copy: [{ label: "Webhook URL", value: "https://app.example.com/hooks" }] },
  { id: "wire", title: "Wire it up", detail: "Ask your agent.", actor: "agent", prompt: "Add the key to .env" },
];

const region = () => document.querySelector("[data-setup-step]") as HTMLElement;
const heading = () => region().querySelector("[data-setup-heading]") as HTMLElement;
const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const click = (el: Element | null) => act(() => (el as HTMLElement).click());
async function clickAsync(el: Element | null) {
  await act(async () => {
    (el as HTMLElement).click();
    // Let the clipboard promise and its state update settle.
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("tokens", () => {
  it("fills {{name}} in detail, prompt and copy values", () => {
    const steps: SetupWizardStep[] = [
      {
        title: "Key",
        detail: "Open {{dashboard}} for {{project}}.",
        copy: [{ label: "URL", value: "{{appUrl}}/hooks" }],
      },
      { title: "Agent", detail: "x", actor: "agent", prompt: "Use {{project}} at {{appUrl}}" },
    ];
    const tokens = { dashboard: "Settings", project: "acme", appUrl: "https://app.example.com" };
    const { rerender } = mount(<SetupWizard steps={steps} tokens={tokens} value={{ current: 0, done: [] }} onChange={() => {}} />);

    expect(q("[data-setup-detail]")!.textContent).toBe("Open Settings for acme.");
    expect(q("[data-setup-copy-value]")!.textContent).toContain("https://app.example.com/hooks");

    rerender(<SetupWizard steps={steps} tokens={tokens} value={{ current: 1, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-prompt]")!.textContent).toContain("Use acme at https://app.example.com");
  });

  it("is literal replacement: a $& or $1 in a value is not a replacement pattern", () => {
    mount(
      <SetupWizard
        steps={[{ title: "t", detail: "pay {{price}} now" }]}
        tokens={{ price: "$& and $1" }}
        value={{ current: 0, done: [] }}
        onChange={() => {}}
      />,
    );
    expect(q("[data-setup-detail]")!.textContent).toBe("pay $& and $1 now");
  });

  it("leaves an unknown token as written and warns once in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const steps: SetupWizardStep[] = [
      { title: "t", detail: "Use {{zzUnknownOne}} and {{zzUnknownOne}} again", prompt: "{{zzUnknownOne}}" },
    ];
    const { rerender } = mount(<SetupWizard steps={steps} tokens={{}} value={{ current: 0, done: [] }} onChange={() => {}} />);
    rerender(<SetupWizard steps={steps} tokens={{ other: "x" }} value={{ current: 0, done: [] }} onChange={() => {}} />);

    expect(q("[data-setup-detail]")!.textContent).toBe("Use {{zzUnknownOne}} and {{zzUnknownOne}} again");
    const mine = warn.mock.calls.filter((c) => String(c[0]).includes("zzUnknownOne"));
    expect(mine).toHaveLength(1);
  });

  it("cannot inject HTML through a token", () => {
    const evil = '<img src=x onerror="window.__pwned=1"><b>bold</b>';
    mount(
      <SetupWizard
        steps={[
          {
            title: "t",
            detail: "Hello {{name}}",
            copy: [{ label: "v", value: "{{name}}" }],
          },
        ]}
        tokens={{ name: evil }}
        value={{ current: 0, done: [] }}
        onChange={() => {}}
      />,
    );
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect(q("[data-setup-detail]")!.textContent).toBe(`Hello ${evil}`);
    expect(q("[data-setup-copy-value]")!.textContent).toContain(evil);
  });
});

describe("the current step", () => {
  it("shows one step at a time as a labelled region, with a step indicator", () => {
    mount(<SetupWizard steps={STEPS} value={{ current: 1, done: [0] }} onChange={() => {}} />);

    expect(document.querySelectorAll("[data-setup-step]")).toHaveLength(1);
    expect(region().getAttribute("role")).toBe("region");
    expect(region().getAttribute("data-setup-step")).toBe("key");
    expect(region().getAttribute("aria-labelledby")).toBe(heading().id);
    expect(heading().textContent).toBe("Copy your key");

    // The indicator is react-fancy's Stepper: one entry per step.
    const indicator = q("[data-setup-indicator]")!;
    expect(indicator.hasAttribute("data-react-fancy-stepper")).toBe(true);
    expect(indicator.querySelectorAll("[data-react-fancy-stepper-step]")).toHaveLength(3);
    const states = Array.from(indicator.querySelectorAll("[data-react-fancy-stepper-step]")).map((s) =>
      s.getAttribute("data-state"),
    );
    expect(states).toEqual(["complete", "current", "upcoming"]);
  });

  it("does not call a skipped step complete just because it is behind the current one", () => {
    mount(<SetupWizard steps={STEPS} value={{ current: 2, done: [1] }} onChange={() => {}} />);
    const states = Array.from(document.querySelectorAll("[data-react-fancy-stepper-step]")).map((s) =>
      s.getAttribute("data-state"),
    );
    expect(states).toEqual(["upcoming", "complete", "current"]);
  });

  it("badges who does the step: You by default, Your agent for an agent step", () => {
    const { rerender } = mount(<SetupWizard steps={STEPS} value={{ current: 0, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-actor]")!.getAttribute("data-setup-actor")).toBe("person");
    expect(q("[data-setup-actor]")!.textContent).toBe("You");

    rerender(<SetupWizard steps={STEPS} value={{ current: 2, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-actor]")!.getAttribute("data-setup-actor")).toBe("agent");
    expect(q("[data-setup-actor]")!.textContent).toBe("Your agent");
  });

  it("renders an http(s) url as an Open <host> link in a new tab", () => {
    mount(<SetupWizard steps={STEPS} value={{ current: 0, done: [] }} onChange={() => {}} />);
    const a = q("[data-setup-open]") as HTMLAnchorElement;
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe("https://dashboard.example.com/signup");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    expect(a.textContent).toContain("Open dashboard.example.com");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://files.example.com/x", "/relative", "not a url"])(
    "does not render %s as a link",
    (url) => {
      mount(<SetupWizard steps={[{ title: "t", detail: "d", url }]} value={{ current: 0, done: [] }} onChange={() => {}} />);
      // Positive control: the step rendered, so the absence below means something.
      expect(q("[data-setup-detail]")!.textContent).toBe("d");
      expect(q("[data-setup-open]")).toBeNull();
      expect(document.querySelectorAll("a")).toHaveLength(0);
    },
  );

  it("shows the done line when set, and not otherwise", () => {
    const steps: SetupWizardStep[] = [
      { title: "t", detail: "d", done: "the dashboard shows a green dot" },
      { title: "u", detail: "d" },
    ];
    const { rerender } = mount(<SetupWizard steps={steps} value={{ current: 0, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-done]")!.textContent).toBe("You'll know it worked when: the dashboard shows a green dot");
    rerender(<SetupWizard steps={steps} value={{ current: 1, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-done]")).toBeNull();
  });
});

describe("copy", () => {
  it("copies a copy entry's value and shows Copied, announced politely", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    mount(<SetupWizard steps={STEPS} value={{ current: 1, done: [] }} onChange={() => {}} />);

    const entry = q("[data-setup-copy-entry]")!;
    expect(entry.textContent).toContain("Webhook URL");
    const btn = q('[data-setup-copy="0"]')!;
    expect(btn.textContent).toBe("Copy");

    await clickAsync(btn);

    expect(writeText).toHaveBeenCalledWith("https://app.example.com/hooks");
    expect(btn.getAttribute("data-copy-state")).toBe("copied");
    expect(btn.textContent).toBe("Copied");
    const live = q("[data-setup-live]")!;
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("Copied");
  });

  it("an agent step shows the prompt with one Copy prompt button and the paste hint", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard(writeText);
    mount(<SetupWizard steps={STEPS} value={{ current: 2, done: [] }} onChange={() => {}} />);

    expect(q("[data-setup-prompt]")!.textContent).toContain("Add the key to .env");
    expect(document.querySelectorAll("[data-setup-copy-prompt]")).toHaveLength(1);
    expect(q("[data-setup-agent-hint]")!.textContent).toBe("Paste this prompt to the agent building your app.");
    // The prompt block carries no copy button of its own; there is ONE.
    expect(region().querySelector("[data-react-fancy-code-block-copy]")).toBeNull();

    const btn = q("[data-setup-copy-prompt]")!;
    expect(btn.textContent).toBe("Copy prompt");
    await clickAsync(btn);

    expect(writeText).toHaveBeenCalledWith("Add the key to .env");
    expect(btn.textContent).toBe("Copied");
    expect(q("[data-setup-live]")!.textContent).toBe("Copied");
  });

  it("with no clipboard, selects the text instead and says so", async () => {
    setClipboard(undefined);
    mount(<SetupWizard steps={STEPS} value={{ current: 1, done: [] }} onChange={() => {}} />);

    const btn = q('[data-setup-copy="0"]')!;
    await clickAsync(btn);

    const sel = window.getSelection()!;
    expect(sel.rangeCount).toBe(1);
    expect(sel.getRangeAt(0).toString()).toBe("https://app.example.com/hooks");
    expect(btn.getAttribute("data-copy-state")).toBe("selected");
    expect(q("[data-setup-live]")!.textContent).toBe(
      "Couldn't copy. The text is selected, so you can copy it yourself.",
    );
  });

  it("when the clipboard refuses, selects the prompt instead", async () => {
    setClipboard(vi.fn(async () => {
      throw new Error("denied");
    }));
    mount(<SetupWizard steps={STEPS} value={{ current: 2, done: [] }} onChange={() => {}} />);

    await clickAsync(q("[data-setup-copy-prompt]"));
    expect(window.getSelection()!.getRangeAt(0).toString()).toBe("Add the key to .env");
    expect(q("[data-setup-copy-prompt]")!.getAttribute("data-copy-state")).toBe("selected");
  });
});

describe("controlled navigation", () => {
  it("only reports the next value; it does not move on its own", () => {
    const onChange = vi.fn();
    mount(<SetupWizard steps={STEPS} value={{ current: 0, done: [] }} onChange={onChange} />);

    click(q("[data-setup-next]"));
    expect(onChange).toHaveBeenCalledWith({ current: 1, done: [0] });
    // Still on step one: the parent did not apply it.
    expect(heading().textContent).toBe("Create an account");
  });

  it("marks done, goes back, and jumps to any step", () => {
    const spy = vi.fn();
    mount(<Harness steps={STEPS} spy={spy} />);

    expect((q("[data-setup-back]") as HTMLButtonElement).disabled).toBe(true);
    expect(q("[data-setup-next]")!.textContent).toBe("Mark done and continue");

    click(q("[data-setup-next]"));
    expect(spy).toHaveBeenLastCalledWith({ current: 1, done: [0] });
    expect(heading().textContent).toBe("Copy your key");

    click(q("[data-setup-back]"));
    expect(spy).toHaveBeenLastCalledWith({ current: 0, done: [0] });

    // Jump straight to the third step through the indicator.
    const triggers = document.querySelectorAll("[data-react-fancy-stepper-trigger]");
    click(triggers[2]);
    expect(spy).toHaveBeenLastCalledWith({ current: 2, done: [0] });
    expect(heading().textContent).toBe("Wire it up");

    // Last step, no verify: "Mark done" records it and stays.
    expect(q("[data-setup-next]")!.textContent).toBe("Mark done");
    click(q("[data-setup-next]"));
    expect(spy).toHaveBeenLastCalledWith({ current: 2, done: [0, 2] });
  });

  it("moves focus to the new step's heading when the step changes, not on first render", () => {
    mount(<Harness steps={STEPS} />);
    expect(document.activeElement).toBe(document.body);

    click(q("[data-setup-next]"));
    expect(document.activeElement).toBe(heading());
    expect(heading().getAttribute("tabindex")).toBe("-1");
  });

  it("gives interactive elements stable ids under the root id", () => {
    mount(<SetupWizard id="stripe-setup" steps={STEPS} value={{ current: 1, done: [] }} onChange={() => {}} />);
    expect(q("[data-setup-wizard]")!.id).toBe("stripe-setup");
    expect(q("[data-setup-next]")!.id).toBe("stripe-setup-next");
    expect(q("[data-setup-back]")!.id).toBe("stripe-setup-back");
    expect(q('[data-setup-copy="0"]')!.id).toBe("stripe-setup-key-copy-0");
    expect(heading().id).toBe("stripe-setup-key-heading");
  });
});

describe("verify", () => {
  it("adds a final Check it works step that shows the result and what it proves", async () => {
    const verify = vi.fn(async () => ({ ok: true, detail: "Connected as acme", proves: "The key reaches the API" }));
    const spy = vi.fn();
    mount(<Harness steps={STEPS} verify={verify} spy={spy} initial={{ current: 3, done: [0, 1, 2] }} />);

    expect(document.querySelectorAll("[data-react-fancy-stepper-step]")).toHaveLength(4);
    expect(region().getAttribute("data-setup-step")).toBe("verify");
    expect(heading().textContent).toBe("Check it works");
    expect(q("[data-setup-next]")).toBeNull();

    const btn = q("[data-setup-verify]")!;
    expect(btn.textContent).toBe("Check it works");
    await clickAsync(btn);

    expect(verify).toHaveBeenCalledTimes(1);
    const result = q("[data-setup-verify-result]")!;
    expect(result.getAttribute("data-ok")).toBe("true");
    expect(result.textContent).toContain("It works");
    expect(result.textContent).toContain("Connected as acme");
    expect(q("[data-setup-proves]")!.textContent).toBe("What this proves: The key reaches the API");
    expect(spy).toHaveBeenLastCalledWith({ current: 3, done: [0, 1, 2, 3] });
    expect(q("[data-setup-live]")!.textContent).toContain("It works");
  });

  it("shows a failed check and does not mark it done", async () => {
    const verify = vi.fn(async () => ({ ok: false, detail: "401 from the API" }));
    const spy = vi.fn();
    mount(<Harness steps={STEPS} verify={verify} spy={spy} initial={{ current: 3, done: [] }} />);

    await clickAsync(q("[data-setup-verify]"));

    const result = q("[data-setup-verify-result]")!;
    expect(result.getAttribute("data-ok")).toBe("false");
    expect(result.textContent).toContain("It isn't working yet");
    expect(result.textContent).toContain("401 from the API");
    expect(q("[data-setup-proves]")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("treats a verify that throws as a failed check", async () => {
    const verify = vi.fn(async () => {
      throw new Error("network");
    });
    mount(<Harness steps={STEPS} verify={verify} initial={{ current: 3, done: [] }} />);

    await clickAsync(q("[data-setup-verify]"));
    const result = q("[data-setup-verify-result]")!;
    expect(result.getAttribute("data-ok")).toBe("false");
    expect(result.textContent).toContain("The check could not run. Try again.");
  });
});

describe("labels", () => {
  it("overrides every visible string", async () => {
    setClipboard(vi.fn(async () => {}));
    const labels = {
      person: "Toi",
      agent: "Ton agent",
      back: "Retour",
      next: "Continuer",
      finish: "Fini",
      copy: "Copier",
      copyPrompt: "Copier le prompt",
      copied: "Copie",
      open: "Ouvrir {host}",
      doneWhen: "Ca marche quand :",
      agentHint: "Colle-le a ton agent.",
      stepOf: "Etape {current} sur {total}",
      verify: "Verifier",
      verifyTitle: "On verifie",
    };
    const steps: SetupWizardStep[] = [
      { title: "a", detail: "d", url: "https://x.example.com", copy: [{ label: "k", value: "v" }], done: "vert" },
      { title: "b", detail: "d", actor: "agent", prompt: "p" },
    ];
    const { rerender } = mount(
      <SetupWizard steps={steps} labels={labels} verify={async () => ({ ok: true, detail: "ok" })} value={{ current: 0, done: [] }} onChange={() => {}} />,
    );

    expect(q("[data-setup-actor]")!.textContent).toBe("Toi");
    expect(q("[data-setup-back]")!.textContent).toBe("Retour");
    expect(q("[data-setup-next]")!.textContent).toBe("Continuer");
    expect(q('[data-setup-copy="0"]')!.textContent).toBe("Copier");
    expect(q("[data-setup-open]")!.textContent).toContain("Ouvrir x.example.com");
    expect(q("[data-setup-done]")!.textContent).toBe("Ca marche quand : vert");
    expect(q("[data-setup-counter]")!.textContent).toBe("Etape 1 sur 3");

    await clickAsync(q('[data-setup-copy="0"]'));
    expect(q('[data-setup-copy="0"]')!.textContent).toBe("Copie");

    rerender(
      <SetupWizard steps={steps} labels={labels} verify={async () => ({ ok: true, detail: "ok" })} value={{ current: 1, done: [] }} onChange={() => {}} />,
    );
    expect(q("[data-setup-actor]")!.textContent).toBe("Ton agent");
    expect(q("[data-setup-copy-prompt]")!.textContent).toBe("Copier le prompt");
    expect(q("[data-setup-agent-hint]")!.textContent).toBe("Colle-le a ton agent.");

    rerender(
      <SetupWizard steps={steps} labels={labels} verify={async () => ({ ok: true, detail: "ok" })} value={{ current: 2, done: [] }} onChange={() => {}} />,
    );
    expect(heading().textContent).toBe("On verifie");
    expect(q("[data-setup-verify]")!.textContent).toBe("Verifier");
  });
});
