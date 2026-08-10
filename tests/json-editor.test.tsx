// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

/**
 * `keyMap` is a JSON **string**, and the component must parse it ONCE per
 * distinct string — not per row and not per render. That is unobservable from
 * the DOM, so it is asserted by counting calls through a pass-through spy on the
 * real implementation. The spy delegates, so every other test in this file runs
 * against the genuine parser.
 */
const keymapSpy = vi.hoisted(() => ({ calls: 0 }));

vi.mock("../src/components/JsonEditor/JsonEditor.keymap", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/components/JsonEditor/JsonEditor.keymap")>();
  return {
    ...actual,
    parseKeyMap: (source?: string | null) => {
      keymapSpy.calls += 1;
      return actual.parseKeyMap(source);
    },
  };
});

import { JsonEditor } from "../src/components/JsonEditor/JsonEditor";
import {
  findJsonConflicts,
  parseKeyMap,
  resolveKeyRule,
} from "../src/components/JsonEditor/JsonEditor.keymap";
import {
  applyJsonEdit,
  parsePath,
  pathToString,
} from "../src/components/JsonEditor/JsonEditor.paths";
import type { JsonValue } from "../src/components/JsonEditor/JsonEditor.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── harness ─────────────────────────────────────────────────────────────
// Same shape as tests/stable-handles.test.tsx: createRoot + act, no RTL.

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  };
}

function q<T extends Element = HTMLElement>(host: Element, selector: string): T {
  const found = host.querySelector<T>(selector);
  if (!found) throw new Error(`no element for ${selector}`);
  return found;
}

function qa(host: Element, selector: string): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>(selector)];
}

function row(host: Element, path: string): HTMLElement {
  return q(host, `[data-react-fancy-json-editor-row][data-path="${path}"]`);
}

function control<T extends Element = HTMLElement>(
  host: Element,
  path: string,
  tag = "input",
): T {
  return q<T>(host, `[data-react-fancy-json-editor-value][data-path="${path}"] ${tag}`);
}

/** React tracks the DOM value node-side, so a plain assignment is ignored. */
function type(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

function blur(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

// ── keyMap: the string contract ─────────────────────────────────────────

describe("keyMap is a JSON string", () => {
  it("parses a well-formed map and types both nested keys and array elements", () => {
    const parsed = parseKeyMap('{"user.age":"number","tags.*":"string","orders.*.total":"number"}');

    expect(parsed.ok).toBe(true);
    expect(parsed.issues).toEqual([]);
    expect(resolveKeyRule(parsed.rules, ["user", "age"])?.type).toBe("number");
    expect(resolveKeyRule(parsed.rules, ["tags", "0"])?.type).toBe("string");
    expect(resolveKeyRule(parsed.rules, ["orders", "3", "total"])?.type).toBe("number");
    expect(resolveKeyRule(parsed.rules, ["orders", "3", "ref"])).toBeUndefined();
  });

  it("accepts the long form with options and flags", () => {
    const parsed = parseKeyMap(
      '{"role":{"type":"enum","options":["admin","member"],"label":"Role","readOnly":true}}',
    );

    const rule = resolveKeyRule(parsed.rules, ["role"]);
    expect(parsed.ok).toBe(true);
    expect(rule?.type).toBe("enum");
    expect(rule?.options).toEqual(["admin", "member"]);
    expect(rule?.readOnly).toBe(true);
  });

  it("prefers the more literal pattern when two match", () => {
    const parsed = parseKeyMap('{"orders.*.total":"number","orders.0.total":"secret"}');

    expect(resolveKeyRule(parsed.rules, ["orders", "0", "total"])?.type).toBe("secret");
    expect(resolveKeyRule(parsed.rules, ["orders", "1", "total"])?.type).toBe("number");
  });

  it("treats a syntactically invalid string as a keymap failure, not a throw", () => {
    const parsed = parseKeyMap("{not json");

    expect(parsed.ok).toBe(false);
    expect(parsed.rules).toEqual([]);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]!.kind).toBe("keymap");
  });

  it("rejects valid JSON of the wrong shape", () => {
    for (const source of ["[]", '"number"', "42", "null"]) {
      const parsed = parseKeyMap(source);
      expect(parsed.ok, source).toBe(false);
      expect(parsed.issues[0]!.kind, source).toBe("keymap");
    }
  });

  it("drops only the malformed rule, keeping the rest of the map in force", () => {
    const parsed = parseKeyMap('{"a":5,"b":"number","c":"nonsense","d":{"type":"enum"}}');

    expect(parsed.ok).toBe(true);
    expect(resolveKeyRule(parsed.rules, ["b"])?.type).toBe("number");
    expect(resolveKeyRule(parsed.rules, ["a"])).toBeUndefined();
    expect(resolveKeyRule(parsed.rules, ["c"])).toBeUndefined();
    // enum without options cannot type anything — it is a broken rule.
    expect(resolveKeyRule(parsed.rules, ["d"])).toBeUndefined();
    expect(parsed.issues.map((i) => i.kind)).toEqual(["rule", "rule", "rule"]);
    expect(parsed.issues.map((i) => i.path)).toEqual(["a", "c", "d"]);
  });

  it("treats an omitted or empty map as untyped, with no issues", () => {
    for (const source of [undefined, null, "", "   ", "{}"]) {
      const parsed = parseKeyMap(source);
      expect(parsed.ok, String(source)).toBe(true);
      expect(parsed.issues, String(source)).toEqual([]);
      expect(parsed.rules, String(source)).toEqual([]);
    }
  });

  it("escapes a literal dot in a key with a backslash", () => {
    expect(parsePath("a\\.b.c")).toEqual(["a.b", "c"]);
    expect(pathToString(["a.b", "c"])).toBe("a\\.b.c");

    const parsed = parseKeyMap('{"meta.a\\\\.b":"number"}');
    expect(resolveKeyRule(parsed.rules, ["meta", "a.b"])?.type).toBe("number");
  });

  it("is parsed once per distinct string, not once per row or render", () => {
    const before = keymapSpy.calls;
    const map = '{"a":"number","b":"number","c":"number"}';
    const value = { a: 1, b: 2, c: 3, d: 4, e: 5 };

    const { host, rerender, unmount } = mount(<JsonEditor value={value} keyMap={map} />);
    expect(qa(host, "[data-react-fancy-json-editor-row]")).toHaveLength(5);
    // Re-render with the SAME keyMap string and an unrelated prop change.
    rerender(<JsonEditor value={value} keyMap={map} className="x" />);
    expect(keymapSpy.calls - before).toBe(1);

    // A different string is a different map, so it must be re-parsed.
    rerender(<JsonEditor value={value} keyMap='{"a":"string"}' />);
    expect(keymapSpy.calls - before).toBe(2);

    unmount();
  });

  it("surfaces a broken keyMap in the UI instead of silently editing untyped", () => {
    const { host, unmount } = mount(<JsonEditor value={{ age: 30 }} keyMap="{not json" />);

    const root = q(host, "[data-react-fancy-json-editor]");
    expect(root.getAttribute("data-keymap-error")).toBe("true");
    expect(qa(host, "[data-react-fancy-json-editor-issues]")).toHaveLength(1);
    // Rows still render — a broken map must not blank the editor.
    expect(row(host, "age")).toBeTruthy();

    unmount();
  });

  it("does not report a keymap error when the map is merely absent", () => {
    const { host, unmount } = mount(<JsonEditor value={{ age: 30 }} />);

    expect(q(host, "[data-react-fancy-json-editor]").hasAttribute("data-keymap-error")).toBe(false);
    expect(qa(host, "[data-react-fancy-json-editor-issues]")).toHaveLength(0);

    unmount();
  });

  it("reports a malformed rule through onIssuesChange without failing the map", () => {
    const issues = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ a: 1, b: 2 }} keyMap='{"a":5,"b":"number"}' onIssuesChange={issues} />,
    );

    expect(q(host, "[data-react-fancy-json-editor]").hasAttribute("data-keymap-error")).toBe(false);
    expect(row(host, "b").getAttribute("data-type")).toBe("number");
    expect(issues).toHaveBeenCalled();
    expect(issues.mock.calls.at(-1)![0]).toEqual([
      expect.objectContaining({ kind: "rule", path: "a" }),
    ]);

    unmount();
  });
});

// ── typed rendering ─────────────────────────────────────────────────────

describe("the declared type drives the view", () => {
  const value = {
    name: "Ada",
    age: 36,
    active: true,
    role: "admin",
    token: "hunter2",
    tint: "#ff0000",
  };
  const keyMap = JSON.stringify({
    name: "string",
    age: "number",
    active: "boolean",
    role: { type: "enum", options: [{ value: "admin", label: "Administrator" }] },
    token: "secret",
    tint: "color",
  });

  it("marks each row with the type it resolved", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} />);

    expect(row(host, "name").getAttribute("data-type")).toBe("string");
    expect(row(host, "age").getAttribute("data-type")).toBe("number");
    expect(row(host, "active").getAttribute("data-type")).toBe("boolean");
    expect(row(host, "role").getAttribute("data-type")).toBe("enum");
    expect(row(host, "token").getAttribute("data-type")).toBe("secret");
    expect(row(host, "tint").getAttribute("data-type")).toBe("color");
    expect(row(host, "name").getAttribute("data-declared")).toBe("true");

    unmount();
  });

  it("renders an enum as its option label, not its raw value", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} />);

    expect(row(host, "role").textContent).toContain("Administrator");

    unmount();
  });

  it("masks a secret in the view and never puts it in the DOM as text", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} />);

    expect(row(host, "token").textContent).not.toContain("hunter2");

    unmount();
  });

  it("infers a type from the value when the keyMap is silent", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{ n: 1, s: "x", b: false, o: {}, a: [], z: null }} />,
    );

    expect(row(host, "n").getAttribute("data-type")).toBe("number");
    expect(row(host, "s").getAttribute("data-type")).toBe("string");
    expect(row(host, "b").getAttribute("data-type")).toBe("boolean");
    expect(row(host, "o").getAttribute("data-type")).toBe("object");
    expect(row(host, "a").getAttribute("data-type")).toBe("array");
    // null carries no type information, so the raw editor is the only
    // non-coercing choice.
    expect(row(host, "z").getAttribute("data-type")).toBe("json");
    expect(row(host, "n").getAttribute("data-declared")).toBe("false");

    unmount();
  });

  it("gives each type its own control in edit mode", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} mode="edit" />);

    expect(control<HTMLInputElement>(host, "name").type).toBe("text");
    expect(control<HTMLInputElement>(host, "token").type).toBe("password");
    expect(
      q(host, '[data-react-fancy-json-editor-value][data-path="active"] [role="switch"]'),
    ).toBeTruthy();
    expect(control(host, "role", "select")).toBeTruthy();
    expect(
      q(host, '[data-react-fancy-json-editor-value][data-path="tint"] [data-react-fancy-color-picker]'),
    ).toBeTruthy();

    unmount();
  });

  it("uses a date control for a declared date", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{ born: "1815-12-10" }} keyMap='{"born":"date"}' mode="edit" />,
    );

    expect(control<HTMLInputElement>(host, "born").getAttribute("type")).toBe("date");

    unmount();
  });
});

// ── multi-dimensional data ──────────────────────────────────────────────

describe("nesting", () => {
  const value: JsonValue = {
    user: { name: "Ada", address: { city: "London" } },
    tags: ["a", "b"],
    orders: [{ total: 10 }, { total: 20 }],
  };

  it("addresses every node by a dotted path, arrays included", () => {
    const { host, unmount } = mount(<JsonEditor value={value} />);

    for (const path of [
      "user",
      "user.name",
      "user.address",
      "user.address.city",
      "tags",
      "tags.0",
      "tags.1",
      "orders",
      "orders.0",
      "orders.0.total",
      "orders.1.total",
    ]) {
      expect(row(host, path), path).toBeTruthy();
    }

    unmount();
  });

  it("records depth so nesting is presentable and addressable", () => {
    const { host, unmount } = mount(<JsonEditor value={value} />);

    expect(row(host, "user").getAttribute("data-depth")).toBe("0");
    expect(row(host, "user.address").getAttribute("data-depth")).toBe("1");
    expect(row(host, "user.address.city").getAttribute("data-depth")).toBe("2");
    expect(row(host, "user.address.city").getAttribute("aria-level")).toBe("3");

    unmount();
  });

  it("types array elements through a wildcard", () => {
    const { host, unmount } = mount(
      <JsonEditor value={value} keyMap='{"orders.*.total":"number","tags.*":"string"}' />,
    );

    expect(row(host, "orders.0.total").getAttribute("data-declared")).toBe("true");
    expect(row(host, "orders.1.total").getAttribute("data-declared")).toBe("true");
    expect(row(host, "tags.1").getAttribute("data-declared")).toBe("true");

    unmount();
  });

  it("collapses a container and hides its descendants", () => {
    const onExpandedChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={value} defaultExpanded={["user", "user.address"]} onExpandedChange={onExpandedChange} />,
    );

    expect(row(host, "user.address.city")).toBeTruthy();
    expect(row(host, "user").getAttribute("aria-expanded")).toBe("true");

    click(q(host, '[data-react-fancy-json-editor-toggle][data-path="user"]'));

    expect(onExpandedChange).toHaveBeenCalledWith(["user.address"]);
    expect(qa(host, '[data-react-fancy-json-editor-row][data-path="user.address.city"]')).toHaveLength(0);
    expect(row(host, "user").getAttribute("aria-expanded")).toBe("false");

    unmount();
  });

  it("summarises a container instead of dumping its contents", () => {
    const { host, unmount } = mount(<JsonEditor value={value} defaultExpanded={[]} />);

    expect(row(host, "tags").textContent).toContain("2 items");
    expect(row(host, "user").textContent).toContain("2 keys");

    unmount();
  });
});

// ── editing ─────────────────────────────────────────────────────────────

describe("editing writes through onChange", () => {
  it("edits a nested string", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ user: { name: "Ada" } }} onChange={onChange} mode="edit" />,
    );

    type(control<HTMLInputElement>(host, "user.name"), "Grace");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toEqual({ user: { name: "Grace" } });
    expect(onChange.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ op: "set", path: "user.name", value: "Grace" }),
    );

    unmount();
  });

  it("edits an array element", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ tags: ["a", "b"] }} onChange={onChange} mode="edit" />,
    );

    type(control<HTMLInputElement>(host, "tags.1"), "z");

    expect(onChange.mock.calls[0]![0]).toEqual({ tags: ["a", "z"] });

    unmount();
  });

  it("toggles a boolean through the switch", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ active: true }} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-value][data-path="active"] [role="switch"]'));

    expect(onChange.mock.calls[0]![0]).toEqual({ active: false });

    unmount();
  });

  it("picks an enum value", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor
        value={{ role: "admin" }}
        keyMap='{"role":{"type":"enum","options":["admin","member"]}}'
        onChange={onChange}
        mode="edit"
      />,
    );

    type(control<HTMLSelectElement>(host, "role", "select"), "member");

    expect(onChange.mock.calls[0]![0]).toEqual({ role: "member" });

    unmount();
  });

  it("commits a number as a number, on blur", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ age: 36 }} keyMap='{"age":"number"}' onChange={onChange} mode="edit" />,
    );

    const input = control<HTMLInputElement>(host, "age");
    // Intermediate keystrokes must NOT commit — "1." would land as 1 and the
    // caret would jump.
    type(input, "4");
    type(input, "42");
    expect(onChange).not.toHaveBeenCalled();

    blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toEqual({ age: 42 });
    expect(typeof (onChange.mock.calls[0]![0] as { age: unknown }).age).toBe("number");

    unmount();
  });

  it("does not fire when a commit-on-blur field is unchanged", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ age: 36 }} keyMap='{"age":"number"}' onChange={onChange} mode="edit" />,
    );

    blur(control(host, "age"));

    expect(onChange).not.toHaveBeenCalled();

    unmount();
  });

  it("stores unparseable text verbatim rather than coercing or dropping it", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ age: 36 }} keyMap='{"age":"number"}' onChange={onChange} mode="edit" />,
    );

    const input = control<HTMLInputElement>(host, "age");
    type(input, "abc");
    blur(input);

    // Not 0, not NaN, not silently ignored: the literal text is written and the
    // conflict machinery is what tells the user about it.
    expect(onChange.mock.calls[0]![0]).toEqual({ age: "abc" });

    unmount();
  });

  it("keeps a json-typed node editable as raw text", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor
        value={{ meta: { a: 1 } }}
        keyMap='{"meta":"json"}'
        onChange={onChange}
        mode="edit"
      />,
    );

    const area = control<HTMLTextAreaElement>(host, "meta", "textarea");
    type(area, '{"a":2,"b":3}');
    blur(area);

    expect(onChange.mock.calls[0]![0]).toEqual({ meta: { a: 2, b: 3 } });

    unmount();
  });

  it("honours readOnly by rendering no controls", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{ name: "Ada" }} mode="edit" readOnly />,
    );

    expect(qa(host, "input")).toHaveLength(0);
    expect(qa(host, "[data-react-fancy-json-editor-remove]")).toHaveLength(0);
    expect(qa(host, "[data-react-fancy-json-editor-add]")).toHaveLength(0);

    unmount();
  });

  it("honours a per-rule readOnly", () => {
    const { host, unmount } = mount(
      <JsonEditor
        value={{ id: "x", name: "Ada" }}
        keyMap='{"id":{"type":"string","readOnly":true}}'
        mode="edit"
      />,
    );

    expect(qa(host, '[data-react-fancy-json-editor-value][data-path="id"] input')).toHaveLength(0);
    expect(control(host, "name")).toBeTruthy();

    unmount();
  });
});

// ── the interesting case: value contradicts its declared type ───────────

describe("type-vs-value conflicts are surfaced, never coerced away", () => {
  const keyMap = '{"age":"number","active":"boolean","role":{"type":"enum","options":["admin"]}}';
  const value = { age: "thirty-six", active: "yes", role: "wizard" };

  it("flags the row and keeps the real value visible", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} />);

    expect(row(host, "age").getAttribute("data-conflict")).toBe("true");
    expect(row(host, "age").textContent).toContain("thirty-six");
    expect(row(host, "active").getAttribute("data-conflict")).toBe("true");
    expect(row(host, "role").getAttribute("data-conflict")).toBe("true");

    unmount();
  });

  it("does not flag a value that matches", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{ age: 36 }} keyMap='{"age":"number"}' />,
    );

    expect(row(host, "age").hasAttribute("data-conflict")).toBe(false);

    unmount();
  });

  it("counts the conflicts on the root and lists them", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} />);

    expect(q(host, "[data-react-fancy-json-editor]").getAttribute("data-issues")).toBe("3");
    expect(q(host, "[data-react-fancy-json-editor-issues]").textContent).toContain("age");

    unmount();
  });

  it("reports conflicts through onIssuesChange", () => {
    const issues = vi.fn();
    const { unmount } = mount(
      <JsonEditor value={value} keyMap={keyMap} onIssuesChange={issues} />,
    );

    const reported = issues.mock.calls.at(-1)![0] as { kind: string; path: string; expected: string }[];
    expect(reported).toHaveLength(3);
    expect(reported[0]).toEqual(
      expect.objectContaining({ kind: "type", path: "age", expected: "number", actual: "string" }),
    );

    unmount();
  });

  it("edits a conflicting node as raw text so nothing is lost", () => {
    const { host, unmount } = mount(<JsonEditor value={value} keyMap={keyMap} mode="edit" />);

    // A number control cannot hold "thirty-six"; the conflict editor can.
    expect(control<HTMLInputElement>(host, "age").value).toBe("thirty-six");

    unmount();
  });

  it("detects the conflict at any depth, arrays included", () => {
    const conflicts = findJsonConflicts(
      { orders: [{ total: 10 }, { total: "free" }] },
      parseKeyMap('{"orders.*.total":"number"}').rules,
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.path).toBe("orders.1.total");
  });

  it("reports a required key that is absent", () => {
    const conflicts = findJsonConflicts(
      { name: "Ada" },
      parseKeyMap('{"email":{"type":"string","required":true}}').rules,
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.path).toBe("email");
    expect(conflicts[0]!.message).toMatch(/required/i);
  });

  it("accepts anything for a json-typed node except text that is not JSON", () => {
    const rules = parseKeyMap('{"meta":"json"}').rules;

    expect(findJsonConflicts({ meta: { a: 1 } }, rules)).toEqual([]);
    expect(findJsonConflicts({ meta: [1, 2] }, rules)).toEqual([]);
    expect(findJsonConflicts({ meta: '{"a":1}' }, rules)).toEqual([]);
    expect(findJsonConflicts({ meta: "{oops" }, rules)).toHaveLength(1);
  });
});

// ── structure: add / remove / rename / reorder ──────────────────────────

describe("structural edits", () => {
  it("adds a key to an object", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ user: { name: "Ada" } }} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-add][data-path="user"]'));
    type(q<HTMLInputElement>(host, "[data-react-fancy-json-editor-add-key]"), "email");
    type(q<HTMLSelectElement>(host, "[data-react-fancy-json-editor-add-type]"), "string");
    click(q(host, "[data-react-fancy-json-editor-add-confirm]"));

    expect(onChange.mock.calls[0]![0]).toEqual({ user: { name: "Ada", email: "" } });

    unmount();
  });

  it("seeds the new value from the chosen type", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{}} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-add][data-path=""]'));
    type(q<HTMLInputElement>(host, "[data-react-fancy-json-editor-add-key]"), "count");
    type(q<HTMLSelectElement>(host, "[data-react-fancy-json-editor-add-type]"), "number");
    click(q(host, "[data-react-fancy-json-editor-add-confirm]"));

    expect(onChange.mock.calls[0]![0]).toEqual({ count: 0 });

    unmount();
  });

  it("appends to an array without asking for a key", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ tags: ["a"] }} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-add][data-path="tags"]'));
    expect(qa(host, "[data-react-fancy-json-editor-add-key]")).toHaveLength(0);
    click(q(host, "[data-react-fancy-json-editor-add-confirm]"));

    expect(onChange.mock.calls[0]![0]).toEqual({ tags: ["a", ""] });

    unmount();
  });

  it("removes an object key and an array element", () => {
    const onChange = vi.fn();
    const { host, rerender, unmount } = mount(
      <JsonEditor value={{ a: 1, tags: ["x", "y"] }} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-remove][data-path="a"]'));
    expect(onChange.mock.calls[0]![0]).toEqual({ tags: ["x", "y"] });

    rerender(<JsonEditor value={{ tags: ["x", "y"] }} onChange={onChange} mode="edit" />);
    click(q(host, '[data-react-fancy-json-editor-remove][data-path="tags.0"]'));
    expect(onChange.mock.calls[1]![0]).toEqual({ tags: ["y"] });

    unmount();
  });

  it("renames a key in place, keeping the surrounding order", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ a: 1, b: 2, c: 3 }} onChange={onChange} mode="edit" />,
    );

    const key = q<HTMLInputElement>(host, '[data-react-fancy-json-editor-key][data-path="b"] input');
    type(key, "z");
    blur(key);

    const next = onChange.mock.calls[0]![0] as Record<string, number>;
    expect(Object.keys(next)).toEqual(["a", "z", "c"]);
    expect(next.z).toBe(2);

    unmount();
  });

  it("refuses a rename that would clobber a sibling", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ a: 1, b: 2 }} onChange={onChange} mode="edit" />,
    );

    const key = q<HTMLInputElement>(host, '[data-react-fancy-json-editor-key][data-path="b"] input');
    type(key, "a");
    blur(key);

    expect(onChange).not.toHaveBeenCalled();
    expect(q(host, "[data-react-fancy-json-editor-issues]").textContent).toMatch(/already/i);

    unmount();
  });

  it("moves an array element", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ tags: ["a", "b", "c"] }} onChange={onChange} mode="edit" />,
    );

    click(q(host, '[data-react-fancy-json-editor-move-up][data-path="tags.2"]'));

    expect(onChange.mock.calls[0]![0]).toEqual({ tags: ["a", "c", "b"] });

    unmount();
  });
});

// ── component contract ──────────────────────────────────────────────────

describe("component contract", () => {
  it("is controlled — the DOM follows value, and never its own memory", () => {
    const { host, rerender, unmount } = mount(<JsonEditor value={{ name: "Ada" }} mode="edit" />);

    type(control<HTMLInputElement>(host, "name"), "Grace");
    // No onChange handler, so the controlled value never moved. A component
    // holding its own copy would show "Grace" here.
    rerender(<JsonEditor value={{ name: "Ada" }} mode="edit" />);
    expect(control<HTMLInputElement>(host, "name").value).toBe("Ada");

    rerender(<JsonEditor value={{ name: "Hopper" }} mode="edit" />);
    expect(control<HTMLInputElement>(host, "name").value).toBe("Hopper");

    unmount();
  });

  it("forwards caller data-* and aria-* to the root", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{}} data-handle="je" aria-label="Config" id="cfg" />,
    );

    expect(host.querySelector("[data-handle='je']")).toBeTruthy();
    expect(q(host, "[data-react-fancy-json-editor]").getAttribute("aria-label")).toBe("Config");
    expect(q(host, "[data-react-fancy-json-editor]").id).toBe("cfg");

    unmount();
  });

  it("spreads rest BEFORE its own attributes, so a caller cannot clobber them", () => {
    const { host, unmount } = mount(
      <JsonEditor
        value={{}}
        className="mine"
        {...({ "data-react-fancy-json-editor": "hacked" } as Record<string, string>)}
      />,
    );

    const root = q(host, "[data-react-fancy-json-editor]");
    expect(root.getAttribute("data-react-fancy-json-editor")).toBe("");
    expect(root.className).toContain("mine");

    unmount();
  });

  it("gives every row and control a stable handle", () => {
    const { host, unmount } = mount(
      <JsonEditor value={{ user: { name: "Ada" } }} mode="edit" idPrefix="cfg" />,
    );

    expect(row(host, "user.name").getAttribute("data-key")).toBe("name");
    expect(control<HTMLInputElement>(host, "user.name").id).toBe("cfg-user.name");
    expect(q(host, "[data-react-fancy-json-editor-tree]").getAttribute("role")).toBe("tree");
    expect(row(host, "user.name").getAttribute("role")).toBe("treeitem");

    unmount();
  });

  it("broadcasts activity for every mutation", () => {
    const onActivity = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor value={{ name: "Ada" }} onChange={() => {}} onActivity={onActivity} mode="edit" />,
    );

    type(control<HTMLInputElement>(host, "name"), "Grace");

    expect(onActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "commit", edit: expect.objectContaining({ op: "set", path: "name" }) }),
    );

    unmount();
  });
});

// ── trust-but-verify ────────────────────────────────────────────────────

describe("pendingMode stages writes instead of applying them", () => {
  it("routes an edit into pending, leaving value untouched", () => {
    const onChange = vi.fn();
    const onPendingChange = vi.fn();
    const { host, unmount } = mount(
      <JsonEditor
        value={{ name: "Ada" }}
        onChange={onChange}
        mode="edit"
        pendingMode
        pending={[]}
        onPendingChange={onPendingChange}
      />,
    );

    type(control<HTMLInputElement>(host, "name"), "Grace");

    expect(onChange).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenCalledTimes(1);
    const staged = onPendingChange.mock.calls[0]![0] as { id: string; op: string; path: string }[];
    expect(staged).toHaveLength(1);
    expect(staged[0]).toEqual(expect.objectContaining({ op: "set", path: "name", value: "Grace" }));
    expect(staged[0]!.id).toBeTruthy();

    unmount();
  });

  it("marks the staged row and offers accept / reject", () => {
    const pending = [{ id: "p1", op: "set" as const, path: "name", value: "Grace" }];
    const { host, unmount } = mount(
      <JsonEditor value={{ name: "Ada" }} pendingMode pending={pending} onPendingChange={() => {}} />,
    );

    expect(row(host, "name").getAttribute("data-pending")).toBe("true");
    expect(q(host, '[data-react-fancy-json-editor-accept][data-id="p1"]')).toBeTruthy();
    expect(q(host, '[data-react-fancy-json-editor-reject][data-id="p1"]')).toBeTruthy();
    // The proposal is visible next to what is there now.
    expect(row(host, "name").textContent).toContain("Grace");
    expect(row(host, "name").textContent).toContain("Ada");

    unmount();
  });

  it("applies on accept and drops on reject", () => {
    const onChange = vi.fn();
    const onPendingChange = vi.fn();
    const pending = [{ id: "p1", op: "set" as const, path: "name", value: "Grace" }];

    const accepted = mount(
      <JsonEditor
        value={{ name: "Ada" }}
        onChange={onChange}
        pendingMode
        pending={pending}
        onPendingChange={onPendingChange}
      />,
    );
    click(q(accepted.host, '[data-react-fancy-json-editor-accept][data-id="p1"]'));
    expect(onChange.mock.calls[0]![0]).toEqual({ name: "Grace" });
    expect(onPendingChange).toHaveBeenCalledWith([]);
    accepted.unmount();

    onChange.mockClear();
    onPendingChange.mockClear();

    const rejected = mount(
      <JsonEditor
        value={{ name: "Ada" }}
        onChange={onChange}
        pendingMode
        pending={pending}
        onPendingChange={onPendingChange}
      />,
    );
    click(q(rejected.host, '[data-react-fancy-json-editor-reject][data-id="p1"]'));
    expect(onChange).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenCalledWith([]);
    rejected.unmount();
  });
});

// ── the headless seam a bridge would use ────────────────────────────────

describe("applyJsonEdit is the same op a bridge would replay", () => {
  it("sets, removes, renames, inserts and moves", () => {
    expect(applyJsonEdit({ a: { b: 1 } }, { op: "set", path: "a.b", value: 2 })).toEqual({ a: { b: 2 } });
    expect(applyJsonEdit({ a: 1, b: 2 }, { op: "remove", path: "a" })).toEqual({ b: 2 });
    expect(applyJsonEdit({ a: [1, 2, 3] }, { op: "remove", path: "a.1" })).toEqual({ a: [1, 3] });
    expect(applyJsonEdit({ a: 1, b: 2 }, { op: "rename", path: "a", key: "z" })).toEqual({ z: 1, b: 2 });
    expect(applyJsonEdit({ a: {} }, { op: "insert", path: "a", key: "n", value: 1 })).toEqual({ a: { n: 1 } });
    expect(applyJsonEdit({ a: [1] }, { op: "insert", path: "a", value: 2 })).toEqual({ a: [1, 2] });
    expect(applyJsonEdit({ a: [1, 2, 3] }, { op: "move", path: "a.2", to: 0 })).toEqual({ a: [3, 1, 2] });
  });

  it("does not mutate the input", () => {
    const before = { a: { b: 1 } };
    const frozen = JSON.stringify(before);

    applyJsonEdit(before, { op: "set", path: "a.b", value: 2 });

    expect(JSON.stringify(before)).toBe(frozen);
  });

  it("returns the value unchanged when the path does not exist", () => {
    const before = { a: 1 };
    expect(applyJsonEdit(before, { op: "set", path: "x.y", value: 2 })).toEqual({ a: 1 });
  });

  it("replaces the root when the path is empty", () => {
    expect(applyJsonEdit({ a: 1 }, { op: "set", path: "", value: { b: 2 } })).toEqual({ b: 2 });
  });
});
