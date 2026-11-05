// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QrCodePanel, type QrCodeActionEvent } from "../src/components/QrCode";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `QrCodePanel` is `<QrCode>` plus what a person does with a code: download it
 * as SVG or PNG, share it (or copy it where the Web Share API is absent),
 * print it, and read the value as text.
 *
 * It is a composition rather than new props on `<QrCode>`, which stays an
 * `<svg>` and nothing else. Every action reports through `onAction` with a
 * plain-JSON event, and every part carries a stable `data-react-fancy-*`
 * handle, so an agent reads and drives it without guessing at markup.
 */

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => {
        root.render(el);
    });
    return host;
}

const URL_VALUE = "https://example.com/r/AbC123";
const flush = () => act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
});

let created: Blob[] = [];
let clicked: { href: string; download: string }[] = [];

beforeEach(() => {
    created = [];
    clicked = [];
    vi.stubGlobal("Path2D", class {
        constructor(public d: string) {}
    });
    URL.createObjectURL = vi.fn((blob: Blob) => {
        created.push(blob);
        return `blob:test/${created.length}`;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push({ href: this.href, download: this.download });
    });
    // jsdom has no canvas: a stub that resolves a PNG blob.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => ({
        fillStyle: "#000000",
        imageSmoothingEnabled: true,
        fillRect: () => undefined,
        setTransform: () => undefined,
        fill: () => undefined,
    }) as unknown as CanvasRenderingContext2D);
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
        cb(new Blob(["png"], { type: "image/png" }));
    };
});

afterEach(() => {
    for (const root of roots.splice(0)) {
        act(() => root.unmount());
    }
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "clipboard");
});

const actionButton = (host: HTMLElement, action: string) =>
    host.querySelector(`[data-react-fancy-qr-code-action="${action}"]`) as HTMLButtonElement;

describe("QrCodePanel structure", () => {
    it("wraps a QrCode named by its label, under a stable root handle", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="Your ambassador link" />);
        const root = host.querySelector("[data-react-fancy-qr-code-panel]") as HTMLElement;
        expect(root).not.toBeNull();
        expect(root.getAttribute("role")).toBe("group");
        expect(root.getAttribute("aria-label")).toBe("Your ambassador link");
        const svg = root.querySelector("[data-react-fancy-qr-code-panel-code] svg") as SVGSVGElement;
        expect(svg.getAttribute("role")).toBe("img");
        expect(svg.getAttribute("aria-label")).toBe("Your ambassador link");
    });

    it("renders the four actions by default, in a stable order, as react-fancy Buttons", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" />);
        const buttons = Array.from(host.querySelectorAll("[data-react-fancy-qr-code-action]"));
        expect(buttons.map((b) => b.getAttribute("data-react-fancy-qr-code-action"))).toEqual([
            "download-svg",
            "download-png",
            "share",
            "print",
        ]);
        for (const button of buttons) {
            expect(button.tagName).toBe("BUTTON");
            expect(button.getAttribute("type")).toBe("button");
            expect(button.hasAttribute("data-react-fancy-action")).toBe(true);
            expect((button as HTMLButtonElement).disabled).toBe(false);
            // A visible text label, not an icon a screen reader names as nothing.
            expect(button.textContent?.trim().length).toBeGreaterThan(0);
        }
    });

    it("takes the actions as a JSON array, in the caller's order", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" actions={["print", "download-png"]} />);
        const names = Array.from(host.querySelectorAll("[data-react-fancy-qr-code-action]")).map((b) =>
            b.getAttribute("data-react-fancy-qr-code-action"),
        );
        expect(names).toEqual(["print", "download-png"]);
    });

    it("renders no action group at all for an empty list", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" actions={[]} />);
        expect(host.querySelector("[data-react-fancy-qr-code-panel-actions]")).toBeNull();
    });

    it("shows the value as selectable text only when asked, because not every value is for reading out", () => {
        const hidden = mount(<QrCodePanel value="WIFI:T:WPA;S:Guest;P:hunter2;;" label="x" />);
        expect(hidden.querySelector("[data-react-fancy-qr-code-panel-value]")).toBeNull();
        expect(hidden.textContent).not.toContain("hunter2");

        const shown = mount(<QrCodePanel value={URL_VALUE} label="x" showValue />);
        const text = shown.querySelector("[data-react-fancy-qr-code-panel-value]") as HTMLElement;
        expect(text.textContent).toBe(URL_VALUE);
    });

    it("pins the code to a light tile, in dark mode too", () => {
        document.documentElement.classList.add("dark");
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" />);
        const svg = host.querySelector("svg") as SVGSVGElement;
        expect(svg.querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
        expect(svg.querySelector("path")?.getAttribute("fill")).toBe("#000000");
    });

    it("passes the QrCode options through", () => {
        const host = mount(
            <QrCodePanel value={URL_VALUE} label="x" size={300} errorCorrection="H" quietZone={6} />,
        );
        const svg = host.querySelector("svg") as SVGSVGElement;
        expect(svg.getAttribute("width")).toBe("300");
    });

    it("has a polite live region for what each action did", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" />);
        const status = host.querySelector("[data-react-fancy-qr-code-panel-status]") as HTMLElement;
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.getAttribute("role")).toBe("status");
    });
});

describe("QrCodePanel downloads", () => {
    it("downloads an SVG file of the same code and reports it", async () => {
        const events: QrCodeActionEvent[] = [];
        const host = mount(
            <QrCodePanel value={URL_VALUE} label="Your link" fileName="ambassador link" onAction={(e) => events.push(e)} />,
        );
        await act(async () => {
            actionButton(host, "download-svg").click();
        });
        await flush();
        expect(created).toHaveLength(1);
        expect(created[0]?.type).toBe("image/svg+xml");
        const markup = await created[0]?.text();
        expect(markup).toContain("<title>Your link</title>");
        expect(markup).toContain(host.querySelector("path")?.getAttribute("d") ?? "missing");
        expect(clicked).toEqual([{ href: "blob:test/1", download: "ambassador-link.svg" }]);
        expect(events).toEqual([{ action: "download-svg", outcome: "done", fileName: "ambassador-link.svg" }]);
        expect(host.querySelector("[data-react-fancy-qr-code-panel-status]")?.textContent).not.toBe("");
    });

    it("downloads a PNG and reports it", async () => {
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" onAction={(e) => events.push(e)} />);
        await act(async () => {
            actionButton(host, "download-png").click();
        });
        await flush();
        expect(created[0]?.type).toBe("image/png");
        expect(clicked[0]?.download).toBe("qr-code.png");
        expect(events).toEqual([{ action: "download-png", outcome: "done", fileName: "qr-code.png" }]);
    });

    it("reports a failed PNG instead of failing silently", async () => {
        HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
            cb(null);
        };
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" onAction={(e) => events.push(e)} />);
        await act(async () => {
            actionButton(host, "download-png").click();
        });
        await flush();
        expect(clicked).toEqual([]);
        expect(events).toHaveLength(1);
        expect(events[0]?.action).toBe("download-png");
        expect(events[0]?.outcome).toBe("failed");
        expect(typeof events[0]?.error).toBe("string");
    });
});

describe("QrCodePanel share", () => {
    it("uses the Web Share API where it exists, as a url for a web link", async () => {
        const share = vi.fn(async () => undefined);
        Object.defineProperty(navigator, "share", { value: share, configurable: true });
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="Your link" onAction={(e) => events.push(e)} />);
        await flush();
        expect(actionButton(host, "share").getAttribute("data-via")).toBe("share");
        await act(async () => {
            actionButton(host, "share").click();
        });
        await flush();
        expect(share).toHaveBeenCalledWith({ title: "Your link", url: URL_VALUE });
        expect(events).toEqual([{ action: "share", outcome: "done", via: "share" }]);
    });

    it("shares a value that is not a web link as text", async () => {
        const share = vi.fn(async () => undefined);
        Object.defineProperty(navigator, "share", { value: share, configurable: true });
        const host = mount(<QrCodePanel value="SN-4829-13" label="Asset tag" shareTitle="Pump 14" />);
        await flush();
        await act(async () => {
            actionButton(host, "share").click();
        });
        await flush();
        expect(share).toHaveBeenCalledWith({ title: "Pump 14", text: "SN-4829-13" });
    });

    it("reports a dismissed share sheet as cancelled, not failed", async () => {
        const share = vi.fn(async () => {
            throw new DOMException("dismissed", "AbortError");
        });
        Object.defineProperty(navigator, "share", { value: share, configurable: true });
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" onAction={(e) => events.push(e)} />);
        await flush();
        await act(async () => {
            actionButton(host, "share").click();
        });
        await flush();
        expect(events).toEqual([{ action: "share", outcome: "cancelled", via: "share" }]);
    });

    it("falls back to copying, and says so on the button, where Web Share is absent", async () => {
        const writeText = vi.fn(async () => undefined);
        Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" onAction={(e) => events.push(e)} />);
        await flush();
        const button = actionButton(host, "share");
        expect(button.getAttribute("data-via")).toBe("clipboard");
        expect(button.textContent).toContain("Copy link");
        await act(async () => {
            button.click();
        });
        await flush();
        expect(writeText).toHaveBeenCalledWith(URL_VALUE);
        expect(events).toEqual([{ action: "share", outcome: "done", via: "clipboard" }]);
    });

    it("labels the fallback for a value that is not a link without calling it one", async () => {
        Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn() }, configurable: true });
        const host = mount(<QrCodePanel value="SN-4829-13" label="x" />);
        await flush();
        expect(actionButton(host, "share").textContent).not.toContain("link");
    });

    it("falls back to copying when canShare refuses the data", async () => {
        const share = vi.fn();
        const writeText = vi.fn(async () => undefined);
        Object.defineProperty(navigator, "share", { value: share, configurable: true });
        Object.defineProperty(navigator, "canShare", { value: () => false, configurable: true });
        Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" />);
        await flush();
        await act(async () => {
            actionButton(host, "share").click();
        });
        await flush();
        expect(share).not.toHaveBeenCalled();
        expect(writeText).toHaveBeenCalledWith(URL_VALUE);
    });

    it("reports a refused clipboard as failed", async () => {
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
            configurable: true,
        });
        const events: QrCodeActionEvent[] = [];
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" onAction={(e) => events.push(e)} />);
        await flush();
        await act(async () => {
            actionButton(host, "share").click();
        });
        await flush();
        expect(events).toEqual([{ action: "share", outcome: "failed", via: "clipboard", error: "denied" }]);
    });
});

describe("QrCodePanel print", () => {
    // Every print test fakes setTimeout: the print call is scheduled for the
    // next task, and the stub must be on the frame's window before it runs.
    // With real timers that is a race, and it lost under full-suite load.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout"] });
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    /** Click Print, stub the new frame's print(), then let the print task run. */
    function printFrom(host: HTMLElement): { frame: HTMLIFrameElement; printed: Document[] } {
        act(() => {
            actionButton(host, "print").click();
        });
        const frame = document.querySelector("iframe[data-react-fancy-qr-code-print]") as HTMLIFrameElement;
        const win = frame.contentWindow as Window;
        const printed: Document[] = [];
        win.print = () => {
            printed.push(win.document);
        };
        act(() => {
            vi.runOnlyPendingTimers();
        });
        return { frame, printed };
    }

    it("prints a frame holding nothing but the code, and the value when shown", () => {
        const events: QrCodeActionEvent[] = [];
        const host = mount(
            <QrCodePanel value={URL_VALUE} label="Your link" showValue onAction={(e) => events.push(e)} />,
        );
        const { frame, printed: prints } = printFrom(host);
        expect(frame.getAttribute("aria-hidden")).toBe("true");

        expect(prints).toHaveLength(1);
        const doc = prints[0] as Document;
        expect(doc.title).toBe("Your link");
        const svgs = doc.querySelectorAll("svg");
        expect(svgs).toHaveLength(1);
        expect(svgs[0]?.querySelector("title")?.textContent).toBe("Your link");
        expect(svgs[0]?.getAttribute("width")).toBe("50mm");
        expect(doc.body.textContent).toContain(URL_VALUE);
        expect(doc.querySelectorAll("button")).toHaveLength(0);
        expect(events).toEqual([{ action: "print", outcome: "done" }]);
    });

    it("leaves the value out of the print when it is not shown on screen", () => {
        const host = mount(<QrCodePanel value="WIFI:T:WPA;S:Guest;P:hunter2;;" label="x" printSizeMm={80} />);
        const { printed } = printFrom(host);
        expect(printed).toHaveLength(1);
        expect(printed[0]?.body.textContent ?? "").not.toContain("hunter2");
        expect(printed[0]?.querySelector("svg")?.getAttribute("width")).toBe("80mm");
    });

    it("replaces a previous print frame rather than piling them up", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" />);
        let count = 0;
        for (let i = 0; i < 3; i += 1) {
            count += printFrom(host).printed.length;
        }
        expect(count).toBe(3);
        expect(document.querySelectorAll("iframe[data-react-fancy-qr-code-print]")).toHaveLength(1);
    });
});

describe("QrCodePanel keyboard", () => {
    it("puts every action in the tab order and none of the decoration", () => {
        const host = mount(<QrCodePanel value={URL_VALUE} label="x" showValue />);
        const focusable = Array.from(host.querySelectorAll<HTMLElement>("button, [tabindex], a[href]")).filter(
            (el) => el.tabIndex >= 0,
        );
        expect(focusable.map((el) => el.getAttribute("data-react-fancy-qr-code-action"))).toEqual([
            "download-svg",
            "download-png",
            "share",
            "print",
        ]);
    });
});
