// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Stat } from "../src/components/Stat/Stat";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("Stat", () => {
  it("renders the figure and its caption", () => {
    const { host, unmount } = mount(<Stat value="120+" label="Projects" />);

    expect(host.textContent).toBe("120+Projects");
    unmount();
  });

  it("sets tabular-nums on the figure, always", () => {
    // The reason this component exists. FIVE of seventeen hand-rolled copies
    // forgot it, and in a proportional face a `1` is narrower than a `0` — so a
    // row that is meant to read as a band comes out visibly ragged, from one
    // property nobody thinks to look for.
    const { host, unmount } = mount(<Stat value="2016" label="Founded" />);
    const figure = host.querySelector("[data-react-fancy-stat] > div") as HTMLElement;

    expect(figure.className).toContain("tabular-nums");
    unmount();
  });

  it("keeps tabular-nums at every size", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      const { host, unmount } = mount(<Stat value="08" label="x" size={size} />);
      const figure = host.querySelector("[data-react-fancy-stat] > div") as HTMLElement;

      expect(figure.className, `size=${size}`).toContain("tabular-nums");
      unmount();
    }
  });

  it("scales the figure without touching the caption", () => {
    const cls = (size: "sm" | "lg") => {
      const { host, unmount } = mount(<Stat value="1" label="x" size={size} />);
      const out = (host.querySelector("[data-react-fancy-stat] > div") as HTMLElement).className;
      unmount();
      return out;
    };

    expect(cls("sm")).toContain("text-xl");
    expect(cls("lg")).toContain("text-5xl");
  });

  it("renders a figure with no caption", () => {
    const { host, unmount } = mount(<Stat value="14" />);

    expect(host.textContent).toBe("14");
    unmount();
  });

  it("hands the whole cell over to children when given them", () => {
    const { host, unmount } = mount(
      <Stat>
        <span>bespoke</span>
      </Stat>,
    );

    expect(host.textContent).toBe("bespoke");
    unmount();
  });
});

describe("Stat.Band", () => {
  it("lays the cells out in a grid of the asked-for width", () => {
    const { host, unmount } = mount(
      <Stat.Band columns={3}>
        <Stat value="1" label="a" />
        <Stat value="2" label="b" />
        <Stat value="3" label="c" />
      </Stat.Band>,
    );
    const band = host.querySelector("[data-react-fancy-stat-band]") as HTMLElement;

    expect(band.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(band.querySelectorAll("[data-react-fancy-stat]")).toHaveLength(3);
    unmount();
  });

  it("defaults to four columns, the shape the band actually appears in", () => {
    const { host, unmount } = mount(<Stat.Band />);

    expect((host.firstElementChild as HTMLElement).style.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    unmount();
  });

  it("hangs off Stat rather than being a second top-level export to remember", () => {
    expect(Object.keys(Stat)).toContain("Band");
  });
});

describe("restyling hooks", () => {
  it("exposes a stable handle on every part", () => {
    // The component contract asks for stable identity on the parts, and it is
    // what makes a primitive restylable: the gallery styles target
    // `.swiss-figure__num`, so without a hook per part they could only replace
    // the component, not restyle it — which is how twenty-seven copies happened.
    const { host, unmount } = mount(<Stat value="2016" label="Founded" className="swiss-figure" />);

    expect(host.querySelector("[data-react-fancy-stat-value]")?.textContent).toBe("2016");
    expect(host.querySelector("[data-react-fancy-stat-label]")?.textContent).toBe("Founded");
    unmount();
  });
});
