// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ActivityLight } from "../src/components/ActivityLight";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `ActivityLight` indicates activity on an EDGE — a relationship between two
 * parties — not the presence of one. `Avatar status` is the presence dot and
 * belongs to a single party; this belongs to a pair, and carries a recency ramp
 * rather than an online flag.
 *
 * ## The whole point is the difference between "none" and "cannot see"
 *
 * A number that cannot be observed renders as NOTHING — never a dash, never a
 * zero, because **a zero claims the other party worked alone**, which is a
 * false statement rather than a missing one. The corollary matters just as
 * much: a measured `0` from a party we CAN see is a fact and must render.
 *
 * Both halves are pinned below. A component that rendered nothing for both
 * would pass a one-sided test while silently erasing real zeros — which is why
 * the zero cases here are positive controls, not padding.
 */

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(el));

    return host;
}

function lightIn(host: HTMLElement): HTMLElement | null {
    return host.querySelector<HTMLElement>("[data-react-fancy-activity-light]");
}

function countIn(host: HTMLElement): string | null {
    return host.querySelector<HTMLElement>("[data-react-fancy-activity-light-count]")?.textContent ?? null;
}

afterEach(() => {
    roots.splice(0).forEach((r) => act(() => r.unmount()));
    document.body.innerHTML = "";
});

describe("an undatable edge renders nothing", () => {
    it("renders no element at all for level null", () => {
        const host = mount(<ActivityLight level={null} label="Weaver and Fancy" />);

        // Not a grey dot, not a dash, not an empty box that still takes space
        // in the lane. A grey dot is a claim — "this edge is quiet" — and the
        // whole reason `null` exists is that we cannot make it.
        expect(lightIn(host)).toBeNull();
        expect(host.innerHTML).toBe("");
    });

    it("renders nothing even when a count is supplied, because the level governs", () => {
        // The component indicates the RECENCY of an edge. With recency unknown
        // there is no indicator to render, so there is nowhere to hang a count.
        const host = mount(<ActivityLight level={null} count={5} label="Weaver and Fancy" />);

        expect(lightIn(host)).toBeNull();
        expect(host.innerHTML).toBe("");
    });
});

describe("a measured zero is a fact and renders", () => {
    it("renders 0 for a live edge that has exchanged nothing", () => {
        // THE POSITIVE CONTROL. A known-live edge with a measured count of zero
        // is "we looked, and it was none" — materially different from "we could
        // not look", and it must be visible. If this test ever passes because
        // the component renders nothing, the null semantics have collapsed into
        // erasing real data.
        const host = mount(<ActivityLight level="live" count={0} label="Genie and Tynn" />);

        expect(lightIn(host)).not.toBeNull();
        expect(countIn(host)).toBe("0");
    });

    it("renders 0 for a quiet edge too", () => {
        const host = mount(<ActivityLight level="quiet" count={0} label="Genie and Tynn" />);

        expect(countIn(host)).toBe("0");
    });
});

describe("an uncounted edge renders no number", () => {
    it("renders no count for count null", () => {
        const host = mount(<ActivityLight level="live" count={null} label="Genie and Tynn" />);

        // The light is there — the edge IS live, which is observed. Only the
        // volume is unknown.
        expect(lightIn(host)).not.toBeNull();
        expect(countIn(host)).toBeNull();
    });

    it("renders no count when count is omitted entirely", () => {
        const host = mount(<ActivityLight level="live" label="Genie and Tynn" />);

        expect(lightIn(host)).not.toBeNull();
        expect(countIn(host)).toBeNull();
    });

    it("renders a real count", () => {
        const host = mount(<ActivityLight level="recent" count={12} label="Genie and Tynn" />);

        expect(countIn(host)).toBe("12");
    });
});

describe("the recency ramp", () => {
    it("distinguishes every level from every other", () => {
        // Asserted as distinctness rather than specific colours: the palette is
        // a design decision that will change, but two levels that look
        // identical make the ramp a lie, and that must fail.
        const levels = ["live", "recent", "quiet", "unseen"] as const;

        const classes = levels.map((level) => {
            const host = mount(<ActivityLight level={level} label="edge" />);

            return lightIn(host)!.className;
        });

        expect(new Set(classes).size).toBe(levels.length);
    });

    it("exposes the level as a stable handle for an agent to read", () => {
        const host = mount(<ActivityLight level="unseen" label="edge" />);

        expect(lightIn(host)!.getAttribute("data-react-fancy-activity-light")).toBe("unseen");
    });
});

describe("direction", () => {
    it("records the direction it was given", () => {
        for (const direction of ["in", "out", "both"] as const) {
            const host = mount(<ActivityLight level="live" direction={direction} label="edge" />);

            expect(lightIn(host)!.getAttribute("data-react-fancy-activity-light-direction")).toBe(direction);
        }
    });

    it("claims no direction when none was given", () => {
        // Undirected is its own state, not a default of "both" — asserting
        // traffic in both directions nobody observed would be the same class of
        // false claim as a grey dot.
        const host = mount(<ActivityLight level="live" label="edge" />);

        expect(lightIn(host)!.hasAttribute("data-react-fancy-activity-light-direction")).toBe(false);
    });
});

describe("accessibility", () => {
    it("names the edge, so the indicator is not a mystery to a screen reader", () => {
        const host = mount(<ActivityLight level="live" count={3} label="Genie and Tynn" />);
        const light = lightIn(host)!;

        // The accessible name says which edge AND what state, because a colour
        // alone conveys nothing without sight.
        const name = light.getAttribute("aria-label") ?? "";
        expect(name).toContain("Genie and Tynn");
        expect(name).toContain("live");
    });

    it("keeps the count out of the accessible name only when it is unknown", () => {
        const counted = lightIn(mount(<ActivityLight level="live" count={0} label="edge" />))!;
        const uncounted = lightIn(mount(<ActivityLight level="live" count={null} label="edge" />))!;

        expect(counted.getAttribute("aria-label")).toContain("0");
        expect(uncounted.getAttribute("aria-label")).not.toContain("0");
    });
});
