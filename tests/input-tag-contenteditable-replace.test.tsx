// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { contentEditableAdapter } from "../src/components/InputTag/adapters";

/**
 * `contentEditableAdapter.replaceRange` flattened the element.
 *
 * react-fancy#29, reported from production by a consumer whose entire surface
 * is a contenteditable. `el.textContent = next` destroys every element child,
 * so a second tag could never be inserted: the first pill vanished, and the
 * characters around the insert were eaten because `start`/`end` index the
 * VISIBLE TEXT while the host's `insert()` returns a marker of a different
 * length — so the slice drifted by the difference on every insert after the
 * first.
 *
 * The rest of the adapter was already correct: `caretIndex()` and `setCaret()`
 * both node-walk. `replaceRange` was the one place reaching for `textContent`
 * as BOTH reader and writer, which is what made it lossy — reading a flattened
 * string is fine, writing one back is what throws the elements away.
 *
 * So the fix is not "handle pills". It is to resolve the two text indices
 * through the same walk `setCaret` already does and edit through a Range, which
 * leaves every node outside the range untouched by construction.
 */
function editable(html: string) {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.append(el);
  return el;
}

function adapterFor(el: HTMLElement) {
  return contentEditableAdapter({ current: el });
}

describe("contentEditableAdapter.replaceRange", () => {
  it("keeps element children that sit outside the replaced range", () => {
    // A pill already in the text, then a second tag typed after it.
    const el = editable('<span data-pill="1">@alice</span> hi @bo');
    const text = el.textContent!;
    expect(text).toBe("@alice hi @bo");

    // Replace the trailing "@bo" with the resolved tag.
    adapterFor(el).replaceRange(text.length - 3, text.length, "@bob ");

    expect(el.querySelectorAll("[data-pill]")).toHaveLength(1);
    expect(el.textContent).toBe("@alice hi @bob ");
  });

  it("inserts a SECOND tag without losing the first", () => {
    // The reported symptom end to end. The host renders each resolved tag as an
    // element, so by the second insert there is already a pill in the field —
    // which is exactly the state the old code could not survive.
    const el = editable("hello @a world");
    const adapter = adapterFor(el);

    // First insert: the host swaps its own pill in for the resolved text.
    let t = el.textContent!;
    adapter.replaceRange(t.indexOf("@a"), t.indexOf("@a") + 2, "@alice");
    expect(el.textContent).toBe("hello @alice world");

    // `insertNode` splits the text node, so merge them back before addressing
    // the field by a single offset. This is the TEST arranging its own pill,
    // not something the adapter requires.
    el.normalize();

    const at = el.textContent!.indexOf("@alice");
    const pill = document.createElement("span");
    pill.setAttribute("data-pill", "1");
    pill.textContent = "@alice";
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode() as Text;
    range.setStart(node, at);
    range.setEnd(node, at + "@alice".length);
    range.deleteContents();
    range.insertNode(pill);

    expect(el.textContent).toBe("hello @alice world");
    expect(el.querySelectorAll("[data-pill]")).toHaveLength(1);

    // Second insert, after the pill. The pill must still be there afterwards.
    t = el.textContent!;
    adapter.replaceRange(t.length, t.length, " @bob");

    expect(el.textContent).toBe("hello @alice world @bob");
    expect(el.querySelectorAll("[data-pill]")).toHaveLength(1);
  });

  it("replaces across a range that spans an element boundary", () => {
    // deleteContents() has to remove the element in the middle, and only it.
    const el = editable('a<span data-pill="1">MID</span>b tail');
    expect(el.textContent).toBe("aMIDb tail");

    adapterFor(el).replaceRange(1, 5, "X");

    expect(el.textContent).toBe("aX tail");
    expect(el.querySelectorAll("[data-pill]")).toHaveLength(0);
  });

  it("still works on a plain text node, and on an empty editable", () => {
    // The path every existing consumer is on must not regress.
    const plain = editable("abc");
    adapterFor(plain).replaceRange(1, 2, "ZZ");
    expect(plain.textContent).toBe("aZZc");

    const empty = editable("");
    adapterFor(empty).replaceRange(0, 0, "new");
    expect(empty.textContent).toBe("new");
  });

  it("fires an input event so the host re-reads the text", () => {
    const el = editable("hi @a");
    let fired = 0;
    el.addEventListener("input", () => fired++);

    adapterFor(el).replaceRange(3, 5, "@alice");

    expect(fired).toBe(1);
    expect(el.textContent).toBe("hi @alice");
  });
});
