// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChannelPlayer } from "../src/components/ChannelPlayer";
import type { ChannelPlayerProps } from "../src/components/ChannelPlayer";
import { createChannelValue, selectChannel } from "../src/utils/media-channel";
import { registerMediaAdapter } from "../src/utils/media-sources";
import type { Channel, ChannelPlayerValue, MediaTrack } from "../src/utils/media-channel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ChannelPlayer (Unreleased): one controlled player for all three channel
 * kinds. jsdom implements none of HTMLMediaElement's playback, so play / pause
 * / load are mocked and the media events are dispatched by hand, as in
 * streaming-audio.test.tsx.
 */

let root: Root | null = null;
let play: MockInstance<() => Promise<void>>;
let load: MockInstance<() => void>;
const cleanups: Array<() => void> = [];

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return { host, rerender: (next: ReactElement) => act(() => root!.render(next)) };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const control = (name: string) => q<HTMLElement>(`[data-channel-control="${name}"]`);
const media = () => q<HTMLMediaElement>("[data-channel-media]")!;
const fire = (el: Element, type: string) => act(() => void el.dispatchEvent(new Event(type)));
const click = (el: Element | null) => {
  expect(el).not.toBeNull();
  act(() => (el as HTMLElement).click());
};
function setRange(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function fakeTime(el: HTMLMediaElement, duration: number) {
  let now = 0;
  Object.defineProperty(el, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(el, "currentTime", { configurable: true, get: () => now, set: (v: number) => (now = v) });
  return { set: (v: number) => (now = v), get: () => now };
}

const t = (id: string, url = `/media/${id}.mp3`): MediaTrack => ({ id, title: `Song ${id.toUpperCase()}`, artist: "The Band", source: { type: "file", url } });

const SINGLE: Channel = { id: "single", name: "One song", kind: "track", track: t("a") };
const LIST: Channel = { id: "list", name: "Mixtape", kind: "playlist", tracks: [t("a"), t("b"), t("c")] };
const LIVE: Channel = { id: "live", name: "Radio", kind: "live", source: { type: "stream", url: "https://ice.example.com/live" }, nowPlaying: "Morning show" };
const HLS: Channel = { id: "hls", name: "TV", kind: "live", source: { type: "stream", url: "https://cdn.example.com/tv/index.m3u8" } };
const VIDEO: Channel = { id: "video", name: "Film", kind: "track", track: { id: "f", title: "Film", source: { type: "file", url: "/media/film.mp4" } } };
const EMBED: Channel = { id: "yt", name: "Launch", kind: "live", source: { type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" } };
const BAD: Channel = { id: "bad", name: "Bad", kind: "track", track: t("x", "javascript:alert(1)") };
const CHANNELS = [SINGLE, LIST, LIVE, HLS, VIDEO, EMBED, BAD];

const on = (channel: Channel, patch: Partial<ChannelPlayerValue> = {}) => ({ ...selectChannel(createChannelValue(), channel), ...patch });

function Harness(props: Omit<ChannelPlayerProps, "value" | "onChange" | "channels"> & { initial: ChannelPlayerValue; spy?: (v: ChannelPlayerValue) => void }) {
  const { initial, spy, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <ChannelPlayer
      {...rest}
      channels={CHANNELS}
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

describe("ChannelPlayer: basics", () => {
  it("carries its handles and shows what is on", () => {
    mount(<Harness initial={on(LIST)} />);
    const root = q("[data-react-fancy-channel-player]")!;
    expect(root.getAttribute("data-channel-id")).toBe("list");
    expect(root.getAttribute("data-channel-kind")).toBe("playlist");
    expect(root.getAttribute("data-channel-playing")).toBe("false");
    expect(root.textContent).toContain("Song A");
    expect(root.getAttribute("role")).toBe("region");
  });

  it("plays nothing until value.playing, then attaches and plays", async () => {
    const spy = vi.fn();
    mount(<Harness initial={on(LIST)} spy={spy} />);
    expect(play).not.toHaveBeenCalled();
    expect(media().hasAttribute("src")).toBe(false);
    click(control("play"));
    await flush();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true }));
    expect(media().getAttribute("src")).toBe("/media/a.mp3");
    expect(play).toHaveBeenCalled();
    expect(control("play")?.getAttribute("aria-label")).toBe("Pause");
  });

  it("has no channel controls without a channel", () => {
    mount(<Harness initial={createChannelValue()} />);
    expect((control("play") as HTMLButtonElement).disabled).toBe(true);
    expect(q("[data-react-fancy-channel-player]")?.textContent).toContain("Nothing playing");
  });

  it("sets volume and mute on the element", () => {
    mount(<Harness initial={on(LIST, { volume: 0.25, muted: true })} />);
    expect(media().volume).toBe(0.25);
    expect(media().muted).toBe(true);
    click(control("mute"));
    expect(media().muted).toBe(false);
  });
});

describe("ChannelPlayer: playlists", () => {
  it("next / previous move through the play order", () => {
    const spy = vi.fn();
    mount(<Harness initial={on(LIST)} spy={spy} />);
    click(control("next"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: "b" }));
    click(control("prev"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: "a" }));
  });

  it("advances when a track ends, and keeps playing", async () => {
    const spy = vi.fn();
    mount(<Harness initial={on(LIST, { playing: true })} spy={spy} />);
    await flush();
    fire(media(), "ended");
    await flush();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: "b", playing: true }));
    expect(media().getAttribute("src")).toBe("/media/b.mp3");
  });

  it("replays with repeat one", async () => {
    mount(<Harness initial={on(LIST, { playing: true, repeat: "one" })} />);
    await flush();
    const clock = fakeTime(media(), 100);
    clock.set(100);
    const calls = play.mock.calls.length;
    fire(media(), "ended");
    await flush();
    expect(clock.get()).toBe(0);
    expect(play.mock.calls.length).toBeGreaterThan(calls);
  });

  it("has shuffle and repeat controls driven by the value", () => {
    const spy = vi.fn();
    mount(<Harness initial={on(LIST)} spy={spy} />);
    click(control("shuffle"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ shuffle: true }));
    click(control("repeat"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ repeat: "all" }));
  });

  it("a single-track channel has no next, previous or shuffle", () => {
    mount(<Harness initial={on(SINGLE)} />);
    expect(control("next")).toBeNull();
    expect(control("prev")).toBeNull();
    expect(control("shuffle")).toBeNull();
    expect(control("repeat")).not.toBeNull();
  });
});

describe("ChannelPlayer: position", () => {
  it("reports whole-second progress, not every timeupdate", async () => {
    const spy = vi.fn();
    mount(<Harness initial={on(LIST, { playing: true })} spy={spy} />);
    await flush();
    const clock = fakeTime(media(), 200);
    clock.set(10.2);
    fire(media(), "timeupdate");
    clock.set(10.7);
    fire(media(), "timeupdate");
    const positions = spy.mock.calls.map(([v]) => v.position).filter((p) => p === 10);
    expect(positions).toHaveLength(1);
  });

  it("seeks when the value's position moves (how a host or an agent seeks)", async () => {
    let setOuter: (v: ChannelPlayerValue) => void = () => {};
    function Outer() {
      const [value, setValue] = useState(on(LIST, { playing: true }));
      setOuter = setValue;
      return <ChannelPlayer channels={CHANNELS} value={value} onChange={setValue} />;
    }
    mount(<Outer />);
    await flush();
    const clock = fakeTime(media(), 200);
    act(() => setOuter(on(LIST, { playing: true, position: 90 })));
    expect(clock.get()).toBe(90);
  });

  it("the seek bar seeks a file", async () => {
    mount(<Harness initial={on(LIST, { playing: true })} />);
    await flush();
    const clock = fakeTime(media(), 200);
    fire(media(), "durationchange");
    const seek = control("seek")!.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(seek.max).toBe("200");
    setRange(seek, "120");
    expect(clock.get()).toBe(120);
  });
});

describe("ChannelPlayer: live", () => {
  it("shows a LIVE badge and what is on air, and has no seek", () => {
    mount(<Harness initial={on(LIVE)} />);
    expect(q("[data-react-fancy-live-badge]")).not.toBeNull();
    expect(q("[data-react-fancy-channel-player]")?.textContent).toContain("Morning show");
    expect(control("seek")).toBeNull();
  });

  it("drops the connection on pause and reconnects from the live edge on play", async () => {
    const { rerender } = mount(<ChannelPlayer channels={CHANNELS} value={on(LIVE, { playing: true })} onChange={() => {}} />);
    await flush();
    expect(media().getAttribute("src")).toBe("https://ice.example.com/live");
    rerender(<ChannelPlayer channels={CHANNELS} value={on(LIVE, { playing: false })} onChange={() => {}} />);
    expect(media().hasAttribute("src")).toBe(false);
    const loads = load.mock.calls.length;
    rerender(<ChannelPlayer channels={CHANNELS} value={on(LIVE, { playing: true })} onChange={() => {}} />);
    expect(media().getAttribute("src")).toBe("https://ice.example.com/live");
    expect(load.mock.calls.length).toBeGreaterThan(loads);
  });

  it("retries a dropped stream three times with backoff, then gives up", async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const onError = vi.fn();
    mount(<Harness initial={on(LIVE, { playing: true })} spy={spy} onError={onError} />);
    await flush();
    for (const wait of [1000, 2000, 4000]) {
      fire(media(), "error");
      expect(q("[data-channel-status]")?.textContent).toBe("Reconnecting...");
      act(() => void vi.advanceTimersByTime(wait));
    }
    fire(media(), "error");
    expect(onError).toHaveBeenCalledWith("live", "failed");
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }));
    expect(q("[data-channel-error]")?.textContent).toBe("Couldn't connect to Radio.");
  });

  it("says HLS can't play where the browser has no HLS and no adapter is registered", () => {
    const onError = vi.fn();
    mount(<Harness initial={on(HLS, { playing: true })} onError={onError} />);
    expect(onError).toHaveBeenCalledWith("hls", "unsupported");
    expect(q("[data-channel-error]")?.textContent).toBe("This stream can't play in this browser.");
  });

  it("plays HLS through a host adapter (how hls.js plugs in)", async () => {
    const attach = vi.fn(() => () => {});
    cleanups.push(registerMediaAdapter({ id: "hls.js", canPlay: (s) => s.type === "stream", attach }));
    mount(<Harness initial={on(HLS, { playing: true })} />);
    await flush();
    expect(attach).toHaveBeenCalledWith(expect.any(HTMLVideoElement), HLS.kind === "live" ? HLS.source : null);
    expect(q("[data-channel-error]")).toBeNull();
  });
});

describe("ChannelPlayer: sources", () => {
  it("uses a <video> for a video file", () => {
    mount(<Harness initial={on(VIDEO)} />);
    expect(media().tagName).toBe("VIDEO");
    expect(media().getAttribute("data-channel-media")).toBe("video");
  });

  it("uses an embed for an embed source, driven by the value", () => {
    const spy = vi.fn();
    mount(<Harness initial={on(EMBED)} spy={spy} />);
    expect(q("[data-react-fancy-media-embed]")).not.toBeNull();
    expect(q("[data-channel-media]")).toBeNull();
    click(q("[data-embed-poster]"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true }));
    expect(q("iframe")).not.toBeNull();
  });

  it("refuses a non-http src, and reports it", () => {
    const onError = vi.fn();
    const spy = vi.fn();
    mount(<Harness initial={on(BAD, { playing: true })} onError={onError} spy={spy} />);
    expect(onError).toHaveBeenCalledWith("bad", "refused");
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }));
    expect(media().hasAttribute("src")).toBe(false);
    expect(q("[data-channel-error]")?.textContent).toBe("Bad can't be played from this address.");
  });

  it("turns a blocked autoplay into playing: false", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    const spy = vi.fn();
    const onError = vi.fn();
    mount(<Harness initial={on(LIST, { playing: true })} spy={spy} onError={onError} />);
    await flush();
    expect(onError).toHaveBeenCalledWith("list", "blocked");
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ playing: false }));
    expect(q("[data-channel-hint]")?.textContent).toBe("Press play to listen");
  });

  it("announces a channel change in a polite live region", () => {
    const { rerender } = mount(<ChannelPlayer channels={CHANNELS} value={on(LIST)} onChange={() => {}} />);
    rerender(<ChannelPlayer channels={CHANNELS} value={on(LIVE)} onChange={() => {}} />);
    expect(q("[data-channel-announce]")?.getAttribute("aria-live")).toBe("polite");
    expect(q("[data-channel-announce]")?.textContent).toBe("Now on Radio");
  });
});
