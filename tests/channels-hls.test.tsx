// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * The opt-in hls.js adapter (`@particle-academy/react-fancy/channels/hls`).
 * hls.js is mocked: these tests pin what the adapter asks of it (load, attach,
 * destroy, recover) and how a fatal error reaches ChannelPlayer's reconnect.
 * Owner approval: q_8d88f092, 2026-11-14.
 */

type Listener = (event: string, data: { fatal: boolean; type: string; details?: string }) => void;

const state = vi.hoisted(() => ({
  supported: true,
  instances: [] as Array<{
    config: unknown;
    loadSource: ReturnType<typeof vi.fn>;
    attachMedia: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
    recoverMediaError: ReturnType<typeof vi.fn>;
    emit: (data: { fatal: boolean; type: string; details?: string }) => void;
  }>,
}));

vi.mock("hls.js", () => {
  class FakeHls {
    static isSupported = () => state.supported;
    static Events = { ERROR: "hlsError" };
    static ErrorTypes = { NETWORK_ERROR: "networkError", MEDIA_ERROR: "mediaError", OTHER_ERROR: "otherError" };
    listeners: Listener[] = [];
    config: unknown;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    recoverMediaError = vi.fn();
    constructor(config?: unknown) {
      this.config = config;
      state.instances.push({
        config,
        loadSource: this.loadSource,
        attachMedia: this.attachMedia,
        destroy: this.destroy,
        recoverMediaError: this.recoverMediaError,
        emit: (data) => this.listeners.forEach((l) => l("hlsError", data)),
      });
    }
    on(event: string, fn: Listener) {
      if (event === "hlsError") this.listeners.push(fn);
    }
  }
  return { default: FakeHls };
});

import { createHlsAdapter, hlsAdapter, unregisterHlsAdapter, registerHlsAdapter } from "../src/channels/hls";
import { resolveMediaAdapter } from "../src/utils/media-sources";
import { ChannelPlayer } from "../src/components/ChannelPlayer";
import { createChannelValue, selectChannel } from "../src/utils/media-channel";
import type { Channel, ChannelSource } from "../src/utils/media-channel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const HLS: ChannelSource = { type: "stream", url: "https://cdn.example.com/live/index.m3u8" };
const video = () => document.createElement("video");

beforeEach(() => {
  state.supported = true;
  state.instances.length = 0;
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("registration", () => {
  it("registers itself on import, so an HLS stream resolves to it", () => {
    expect(resolveMediaAdapter(HLS, video())?.id).toBe("hls.js");
  });

  it("unregisters, and re-registers once (no duplicates)", () => {
    unregisterHlsAdapter();
    const el = video();
    vi.spyOn(el, "canPlayType").mockReturnValue("");
    expect(resolveMediaAdapter(HLS, el)).toBeNull();
    const off = registerHlsAdapter();
    expect(registerHlsAdapter()).toBe(off);
    expect(resolveMediaAdapter(HLS, el)?.id).toBe("hls.js");
  });

  it("plays only HLS, only where hls.js is supported", () => {
    expect(hlsAdapter.canPlay(HLS, video())).toBe(true);
    expect(hlsAdapter.canPlay({ type: "stream", url: "https://ice.example.com/jazz" }, video())).toBe(false);
    expect(hlsAdapter.canPlay({ type: "file", url: "/a.mp4" }, video())).toBe(false);
    expect(hlsAdapter.canPlay({ type: "stream", url: "https://cdn.example.com/a.mpd" }, video())).toBe(false);
    state.supported = false;
    expect(hlsAdapter.canPlay(HLS, video())).toBe(false);
  });

  it("never gets a refused URL, whatever it would say", () => {
    expect(resolveMediaAdapter({ type: "stream", url: "javascript:alert(1)//x.m3u8", protocol: "hls" }, video())).toBeNull();
  });
});

describe("attach / detach", () => {
  it("loads the source, attaches the element, and passes the host's config", () => {
    const adapter = createHlsAdapter({ config: { lowLatencyMode: true } });
    const el = video();
    adapter.attach(el, HLS);
    const hls = state.instances[0]!;
    expect(hls.config).toEqual({ lowLatencyMode: true });
    expect(hls.loadSource).toHaveBeenCalledWith("https://cdn.example.com/live/index.m3u8");
    expect(hls.attachMedia).toHaveBeenCalledWith(el);
  });

  it("detach destroys the instance and drops any src, so the network stops", () => {
    const el = video();
    const detach = hlsAdapter.attach(el, HLS);
    el.setAttribute("src", "blob:https://app.example.com/1");
    detach();
    expect(state.instances[0]!.destroy).toHaveBeenCalledTimes(1);
    expect(el.hasAttribute("src")).toBe(false);
    detach();
    expect(state.instances[0]!.destroy).toHaveBeenCalledTimes(1);
  });
});

describe("errors", () => {
  it("ignores a non-fatal error (hls.js recovers on its own)", () => {
    const el = video();
    const onError = vi.fn();
    el.addEventListener("error", onError);
    hlsAdapter.attach(el, HLS);
    state.instances[0]!.emit({ fatal: false, type: "networkError" });
    expect(onError).not.toHaveBeenCalled();
    expect(state.instances[0]!.destroy).not.toHaveBeenCalled();
  });

  it("tries one media-error recovery, then gives up and reports", () => {
    const el = video();
    const onError = vi.fn();
    el.addEventListener("error", onError);
    hlsAdapter.attach(el, HLS);
    const hls = state.instances[0]!;
    hls.emit({ fatal: true, type: "mediaError" });
    expect(hls.recoverMediaError).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    hls.emit({ fatal: true, type: "mediaError" });
    expect(hls.destroy).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("a fatal network error is reported as the element's error event", () => {
    const el = video();
    const onError = vi.fn();
    el.addEventListener("error", onError);
    hlsAdapter.attach(el, HLS);
    state.instances[0]!.emit({ fatal: true, type: "networkError" });
    expect(state.instances[0]!.destroy).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("so ChannelPlayer reconnects with a fresh instance after a fatal error", async () => {
    vi.useFakeTimers();
    const CH: Channel = { id: "tv", name: "TV", kind: "live", source: HLS };
    let root: Root | null = null;
    function Harness() {
      const [value, setValue] = useState({ ...selectChannel(createChannelValue(), CH), playing: true });
      return <ChannelPlayer channels={[CH]} value={value} onChange={setValue} />;
    }
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<Harness />));
    await act(async () => {
      await Promise.resolve();
    });
    expect(state.instances).toHaveLength(1);
    act(() => state.instances[0]!.emit({ fatal: true, type: "networkError" }));
    expect(document.querySelector("[data-channel-status]")?.textContent).toBe("Reconnecting...");
    act(() => void vi.advanceTimersByTime(1000));
    expect(state.instances).toHaveLength(2);
    expect(state.instances[1]!.attachMedia).toHaveBeenCalled();
    act(() => root!.unmount());
    host.remove();
  });
});
