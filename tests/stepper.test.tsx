// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Stepper } from "../src/components/Stepper";
import type { StepperStep } from "../src/components/Stepper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return { host, rerender: (next: ReactElement) => act(() => root!.render(next)) };
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
});

const STEPS: StepperStep[] = [
  { id: "account", title: "Create an account", description: "At the provider", content: <p>Sign up first.</p> },
  { id: "key", title: "Copy the API key", description: "From settings", content: <p>Settings, then Keys.</p> },
  { id: "paste", title: "Paste it here", content: <p>Back in this app.</p> },
];

const rootEl = () => document.querySelector("[data-react-fancy-stepper]") as HTMLOListElement;
const stepEls = () => Array.from(document.querySelectorAll("[data-react-fancy-stepper-step]")) as HTMLLIElement[];
const states = () => stepEls().map((el) => el.getAttribute("data-state"));
const triggers = () => Array.from(document.querySelectorAll("[data-react-fancy-stepper-trigger]")) as HTMLButtonElement[];

function press(el: Element, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("Stepper renders steps and their states", () => {
  it("renders an ordered list with one item per step", () => {
    mount(<Stepper steps={STEPS} defaultCurrent={1} aria-label="Provider setup" />);

    expect(rootEl().tagName).toBe("OL");
    expect(rootEl().getAttribute("aria-label")).toBe("Provider setup");
    expect(stepEls()).toHaveLength(3);
    expect(stepEls().every((el) => el.tagName === "LI" && el.parentElement === rootEl())).toBe(true);
    expect(stepEls().map((el) => el.getAttribute("data-index"))).toEqual(["0", "1", "2"]);
    expect(stepEls().map((el) => el.getAttribute("data-step-id"))).toEqual(["account", "key", "paste"]);
  });

  it("renders title, description and content in each step, with handles", () => {
    mount(<Stepper steps={STEPS} />);

    const first = stepEls()[0];
    expect(first.querySelector("[data-react-fancy-stepper-title]")!.textContent).toBe("Create an account");
    expect(first.querySelector("[data-react-fancy-stepper-description]")!.textContent).toBe("At the provider");
    expect(first.querySelector("[data-react-fancy-stepper-content]")!.textContent).toBe("Sign up first.");
    // No description given, so no empty description element.
    expect(stepEls()[2].querySelector("[data-react-fancy-stepper-description]")).toBeNull();
  });

  it("derives complete / current / upcoming from the current index", () => {
    mount(<Stepper steps={STEPS} defaultCurrent={1} />);

    expect(states()).toEqual(["complete", "current", "upcoming"]);
    expect(rootEl().getAttribute("data-current")).toBe("1");
  });

  it("defaults to the first step being current", () => {
    mount(<Stepper steps={STEPS} />);
    expect(states()).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("marks every step complete when current is past the end", () => {
    mount(<Stepper steps={STEPS} current={3} />);
    expect(states()).toEqual(["complete", "complete", "complete"]);
  });

  it("lets a step declare error, which overrides its derived state", () => {
    const steps = STEPS.map((s, i) => (i === 1 ? { ...s, state: "error" as const } : s));
    mount(<Stepper steps={steps} defaultCurrent={1} />);

    expect(states()).toEqual(["complete", "error", "upcoming"]);
    // Still the current step by position: an error is where the user is.
    expect(stepEls()[1].getAttribute("aria-current")).toBe("step");
  });

  it("conveys each state in text, not only colour", () => {
    const steps = STEPS.map((s, i) => (i === 2 ? { ...s, state: "error" as const } : s));
    mount(<Stepper steps={[...steps, { title: "Done" }]} defaultCurrent={1} />);

    const label = (i: number) => stepEls()[i].querySelector("[data-react-fancy-stepper-state]")!.textContent;
    expect(label(0)).toMatch(/completed/i);
    expect(label(1)).toMatch(/current/i);
    expect(label(2)).toMatch(/error/i);
    expect(label(3)).toMatch(/not started/i);
  });

  it("takes custom state words, for translation", () => {
    mount(<Stepper steps={STEPS} defaultCurrent={1} stateLabels={{ complete: "Terminé" }} />);
    expect(stepEls()[0].querySelector("[data-react-fancy-stepper-state]")!.textContent).toMatch(/Terminé/);
    expect(stepEls()[1].querySelector("[data-react-fancy-stepper-state]")!.textContent).toMatch(/current/i);
  });
});

describe("Stepper aria-current", () => {
  it("puts aria-current=step on the current step and nowhere else", () => {
    mount(<Stepper steps={STEPS} defaultCurrent={2} />);

    const current = document.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toBe(stepEls()[2]);
  });

  it("has no current step once every step is complete", () => {
    mount(<Stepper steps={STEPS} current={3} />);
    // Non-vacuous: the steps rendered, and none of them is current.
    expect(stepEls()).toHaveLength(3);
    expect(document.querySelectorAll("[aria-current]")).toHaveLength(0);
  });
});

describe("Stepper is pure content by default", () => {
  it("renders no interactive or form element at all", () => {
    mount(<Stepper steps={STEPS} defaultCurrent={1} />);

    // Non-vacuous: the content rendered, and none of it is interactive.
    expect(stepEls()).toHaveLength(3);
    expect(document.querySelectorAll("[data-react-fancy-stepper-content]")).toHaveLength(3);
    expect(document.querySelectorAll("button, input, select, textarea, form, a, [tabindex]")).toHaveLength(0);
  });

  it("does not react to a click on a step", () => {
    const onChange = vi.fn();
    mount(<Stepper steps={STEPS} onChange={onChange} />);

    act(() => {
      (stepEls()[2].querySelector("[data-react-fancy-stepper-title]") as HTMLElement).click();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(states()).toEqual(["current", "upcoming", "upcoming"]);
  });
});

describe("Stepper controlled and uncontrolled", () => {
  it("uncontrolled: a click on a clickable step moves current and reports it", () => {
    const onChange = vi.fn();
    mount(<Stepper steps={STEPS} defaultCurrent={0} clickable onChange={onChange} />);

    act(() => triggers()[2].click());

    expect(onChange).toHaveBeenCalledWith(2);
    expect(states()).toEqual(["complete", "complete", "current"]);
  });

  it("controlled: reports the click but renders what the parent says", () => {
    const onChange = vi.fn();
    const { rerender } = mount(<Stepper steps={STEPS} current={0} clickable onChange={onChange} />);

    act(() => triggers()[1].click());

    expect(onChange).toHaveBeenCalledWith(1);
    expect(states()).toEqual(["current", "upcoming", "upcoming"]);

    rerender(<Stepper steps={STEPS} current={1} clickable onChange={onChange} />);
    expect(states()).toEqual(["complete", "current", "upcoming"]);
  });

  it("controlled through state round-trips", () => {
    function Host() {
      const [current, setCurrent] = useState(0);
      return <Stepper steps={STEPS} current={current} onChange={setCurrent} clickable />;
    }
    mount(<Host />);

    act(() => triggers()[2].click());
    expect(states()).toEqual(["complete", "complete", "current"]);
    act(() => triggers()[0].click());
    expect(states()).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("does not report a click on the step that is already current", () => {
    const onChange = vi.fn();
    mount(<Stepper steps={STEPS} defaultCurrent={1} clickable onChange={onChange} />);

    act(() => triggers()[1].click());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Stepper clickable steps (opt-in)", () => {
  it("renders each step's header as a type=button", () => {
    mount(<Stepper steps={STEPS} clickable />);

    expect(triggers()).toHaveLength(3);
    expect(triggers().every((b) => b.tagName === "BUTTON" && b.type === "button")).toBe(true);
    // The button's name carries the state and the title.
    expect(triggers()[0].textContent).toMatch(/current/i);
    expect(triggers()[0].textContent).toMatch(/Create an account/);
  });

  it("keeps content out of the button, so links in it stay real links", () => {
    mount(
      <Stepper
        clickable
        steps={[{ title: "Read the docs", content: <a href="/docs">docs</a> }, { title: "Next" }]}
      />,
    );

    const link = document.querySelector('a[href="/docs"]')!;
    expect(link.closest("button")).toBeNull();
  });

  it("renders a disabled step as a disabled button that cannot be chosen", () => {
    const onChange = vi.fn();
    const steps = STEPS.map((s, i) => (i === 2 ? { ...s, disabled: true } : s));
    mount(<Stepper steps={steps} clickable onChange={onChange} />);

    expect(triggers()[2].disabled).toBe(true);
    expect(stepEls()[2].getAttribute("data-disabled")).toBe("true");
    act(() => triggers()[2].click());
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Stepper keyboard, when clickable", () => {
  it("keeps every step button in the tab order, so Enter and Space work natively", () => {
    mount(<Stepper steps={STEPS} clickable />);
    expect(triggers()).toHaveLength(3);
    expect(triggers().every((b) => b.tabIndex === 0 && !b.hasAttribute("tabindex"))).toBe(true);
  });

  it("moves focus with ArrowDown / ArrowUp / Home / End in a vertical stepper", () => {
    mount(<Stepper steps={STEPS} clickable />);

    act(() => triggers()[0].focus());
    press(triggers()[0], "ArrowDown");
    expect(document.activeElement).toBe(triggers()[1]);
    press(triggers()[1], "ArrowUp");
    expect(document.activeElement).toBe(triggers()[0]);
    press(triggers()[0], "End");
    expect(document.activeElement).toBe(triggers()[2]);
    press(triggers()[2], "Home");
    expect(document.activeElement).toBe(triggers()[0]);
  });

  it("moves focus without changing the current step", () => {
    const onChange = vi.fn();
    mount(<Stepper steps={STEPS} clickable onChange={onChange} />);

    act(() => triggers()[0].focus());
    press(triggers()[0], "ArrowDown");
    expect(onChange).not.toHaveBeenCalled();
    expect(states()).toEqual(["current", "upcoming", "upcoming"]);
  });

  it("uses ArrowRight / ArrowLeft in a horizontal stepper", () => {
    mount(<Stepper steps={STEPS} clickable orientation="horizontal" />);

    expect(rootEl().getAttribute("data-orientation")).toBe("horizontal");
    act(() => triggers()[0].focus());
    press(triggers()[0], "ArrowRight");
    expect(document.activeElement).toBe(triggers()[1]);
    press(triggers()[1], "ArrowLeft");
    expect(document.activeElement).toBe(triggers()[0]);
  });

  it("skips disabled steps and does not wrap", () => {
    const steps = STEPS.map((s, i) => (i === 1 ? { ...s, disabled: true } : s));
    mount(<Stepper steps={steps} clickable />);

    act(() => triggers()[0].focus());
    press(triggers()[0], "ArrowDown");
    expect(document.activeElement).toBe(triggers()[2]);
    press(triggers()[2], "ArrowDown");
    expect(document.activeElement).toBe(triggers()[2]);
  });
});

describe("Stepper compound children", () => {
  it("renders Stepper.Step children exactly like the steps array", () => {
    mount(
      <Stepper defaultCurrent={1} aria-label="Setup">
        <Stepper.Step id="account" title="Create an account" description="At the provider">
          <p>Sign up first.</p>
        </Stepper.Step>
        <Stepper.Step id="key" title="Copy the API key" state="error">
          <p>Settings, then Keys.</p>
        </Stepper.Step>
        <Stepper.Step id="paste" title="Paste it here" />
      </Stepper>,
    );

    expect(stepEls()).toHaveLength(3);
    expect(states()).toEqual(["complete", "error", "upcoming"]);
    expect(stepEls()[0].querySelector("[data-react-fancy-stepper-content]")!.textContent).toBe("Sign up first.");
    expect(stepEls()[1].getAttribute("data-step-id")).toBe("key");
    expect(stepEls()[2].querySelector("[data-react-fancy-stepper-content]")).toBeNull();
  });

  it("lets the steps array win when both are given", () => {
    mount(
      <Stepper steps={STEPS}>
        <Stepper.Step title="ignored" />
      </Stepper>,
    );
    expect(stepEls()).toHaveLength(3);
  });
});

describe("Stepper showContent", () => {
  it("shows every step's content by default", () => {
    mount(<Stepper steps={STEPS} />);
    expect(document.querySelectorAll("[data-react-fancy-stepper-content]")).toHaveLength(3);
  });

  it('shows only the current step\'s content with showContent="current"', () => {
    mount(<Stepper steps={STEPS} defaultCurrent={1} showContent="current" />);

    const content = document.querySelectorAll("[data-react-fancy-stepper-content]");
    expect(content).toHaveLength(1);
    expect(stepEls()[1].contains(content[0])).toBe(true);
  });
});

describe("Stepper root", () => {
  it("forwards id, className and data-* to the list", () => {
    mount(<Stepper steps={STEPS} id="setup" className="my-steps" data-testid="s" />);

    expect(rootEl().id).toBe("setup");
    expect(rootEl().className).toContain("my-steps");
    expect(rootEl().getAttribute("data-testid")).toBe("s");
    expect(rootEl().getAttribute("data-orientation")).toBe("vertical");
  });
});
