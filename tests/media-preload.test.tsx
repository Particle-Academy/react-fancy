// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { AudioViewer } from "../src/components/AudioViewer";
import { VideoViewer } from "../src/components/VideoViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `preload` — the attribute these two wrappers forgot to expose.
 *
 * Both render a media element and pass through `controls`, `autoPlay` and
 * `loop`, but not `preload`. With no attribute the browser picks, and Chrome
 * picks `auto` for `<audio>`: MEASURED on the showcase's package grid, mounting
 * a single audio tile transferred the entire 995 KB track before anyone pressed
 * anything. On a page of ~90 tiles that is a megabyte spent rendering a
 * thumbnail.
 *
 * The default here is `metadata` — enough for duration and the scrubber, which
 * is all a viewer needs before someone decides to listen. A host that wants the
 * old behaviour asks for `auto` explicitly, which is the right way round: the
 * expensive option should be the one you opt into.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const media = (tag: "audio" | "video") => document.querySelector(tag)!;

describe("AudioViewer", () => {
  it("defaults to metadata rather than letting the browser choose auto", () => {
    const { unmount } = mount(<AudioViewer src="/x.mp3" />);
    expect(media("audio").getAttribute("preload")).toBe("metadata");
    unmount();
  });

  it("lets a host ask for none — a tile that should cost nothing", () => {
    const { unmount } = mount(<AudioViewer src="/x.mp3" preload="none" />);
    expect(media("audio").getAttribute("preload")).toBe("none");
    unmount();
  });

  it("lets a host ask for auto — the old behaviour, now opt-in", () => {
    const { unmount } = mount(<AudioViewer src="/x.mp3" preload="auto" />);
    expect(media("audio").getAttribute("preload")).toBe("auto");
    unmount();
  });
});

describe("VideoViewer", () => {
  it("defaults to metadata too", () => {
    // Same class of bug, and video files are bigger. A poster hides it: the
    // tile looks instant while the file downloads behind the image.
    const { unmount } = mount(<VideoViewer src="/x.mp4" />);
    expect(media("video").getAttribute("preload")).toBe("metadata");
    unmount();
  });

  it("is overridable", () => {
    const { unmount } = mount(<VideoViewer src="/x.mp4" preload="none" />);
    expect(media("video").getAttribute("preload")).toBe("none");
    unmount();
  });
});
