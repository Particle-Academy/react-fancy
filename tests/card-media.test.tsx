// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Card } from "../src/components/Card/Card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("Card.Media", () => {
  it("hangs off the existing compound rather than being a new component", () => {
    // The story's rule: no new top-level export where extending an existing
    // compound will do. What was asked for was never a different card — it was
    // a card with a picture in it.
    // Both are forwardRef components, so they are objects rather than
    // functions — assert they exist and sit on the same compound.
    expect(Card.Media).toBeDefined();
    expect(Card.Body).toBeDefined();
    expect(Object.keys(Card)).toEqual(expect.arrayContaining(["Media", "Header", "Body", "Footer"]));
  });

  it("renders the image and its corner slots", () => {
    const { host, unmount } = mount(
      <Card interactive>
        <Card.Media
          src="/thumb.png"
          alt="Swiss"
          background="#0a0a0e"
          topLeft={<span data-testid="num">01</span>}
          topRight={<span data-testid="mode">dark</span>}
        />
        <Card.Body>Swiss</Card.Body>
      </Card>,
    );

    const img = host.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/thumb.png");
    expect(img.getAttribute("alt")).toBe("Swiss");
    expect(img.getAttribute("loading")).toBe("lazy");

    expect(host.querySelector('[data-testid="num"]')?.textContent).toBe("01");
    expect(host.querySelector('[data-testid="mode"]')?.textContent).toBe("dark");
    unmount();
  });

  it("keeps the background visible under the image", () => {
    // Not decoration: it shows while the image loads and stays if the image
    // never arrives, so a missing screenshot degrades to the right colour
    // rather than to a hole. The gallery depends on this.
    const { host, unmount } = mount(
      <Card>
        <Card.Media src="/missing.png" background="rgb(10, 10, 14)" />
      </Card>,
    );
    const media = host.querySelector("[data-react-fancy-card-media]") as HTMLElement;

    expect(media.style.background).toBe("rgb(10, 10, 14)");
    unmount();
  });

  it("renders a pure colour tile with no image at all", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Media background="linear-gradient(90deg, #f00, #00f)" />
      </Card>,
    );

    expect(host.querySelector("img")).toBeNull();
    expect((host.querySelector("[data-react-fancy-card-media]") as HTMLElement).style.background).toContain("linear-gradient");
    unmount();
  });

  it("takes a ratio by default and a fixed height when asked", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Media background="#000" />
      </Card>,
    );
    expect((host.querySelector("[data-react-fancy-card-media]") as HTMLElement).style.aspectRatio).toBe("16/9");
    unmount();

    const fixed = mount(
      <Card>
        <Card.Media background="#000" height={122} />
      </Card>,
    );
    const el = fixed.host.querySelector("[data-react-fancy-card-media]") as HTMLElement;

    expect(el.style.height).toBe("122px");
    expect(el.style.aspectRatio, "a fixed height must not also set a ratio").toBe("");
    fixed.unmount();
  });

  it("escapes the parent's child padding", () => {
    // Card's `padding` prop pads every direct child (`[&>*]:px-4 …`),
    // which would inset the media and break the flush-to-the-edge look every
    // caller wants. Plain `p-0` would depend on stylesheet order.
    const { host, unmount } = mount(
      <Card padding="lg">
        <Card.Media background="#000" />
      </Card>,
    );
    const cls = (host.querySelector("[data-react-fancy-card-media]") as HTMLElement).className;

    expect(cls).toContain("!px-0");
    expect(cls).toContain("!py-0");
    unmount();
  });
});

describe("Card interactive", () => {
  it("adds the lift and clips to the rounded corners", () => {
    const { host, unmount } = mount(<Card interactive>x</Card>);
    const cls = (host.firstElementChild as HTMLElement).className;

    expect(cls).toContain("hover:-translate-y-0.5");
    expect(cls).toContain("overflow-hidden");
    unmount();
  });

  it("does not clip a static card", () => {
    // Clipping unconditionally would cut off popovers and dropdowns that
    // legitimately overflow a card.
    const { host, unmount } = mount(<Card>x</Card>);
    const cls = (host.firstElementChild as HTMLElement).className;

    expect(cls).not.toContain("overflow-hidden");
    expect(cls).not.toContain("hover:-translate-y-0.5");
    unmount();
  });

  it("leaves the default Card rendering unchanged", () => {
    // Additive: a Card written before this release must look identical.
    const { host, unmount } = mount(<Card>x</Card>);
    const cls = (host.firstElementChild as HTMLElement).className;

    expect(cls).toContain("rounded-lg");
    expect(cls).toContain("border");
    unmount();
  });
});
