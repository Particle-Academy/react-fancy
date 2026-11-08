// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { act, createRef, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  StreamingAudio,
  guessStationKind,
  isPlayableSrc,
} from "../src/components/StreamingAudio";
import type {
  StreamingAudioProps,
  StreamingAudioValue,
  StreamingStation,
} from "../src/components/StreamingAudio";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * StreamingAudio (6.16.0): server-hosted MP3s and Icecast/Shoutcast live
 * streams through the native <audio> element only.
 *
 * jsdom implements none of HTMLMediaElement's playback, so play / pause / load
 * are mocked on the prototype and the media events the browser would fire
 * (error, stalled, durationchange, timeupdate) are dispatched by hand.
 */

let root: Root | null = null;
let play: MockInstance<() => Promise<void>>;
let pause: MockInstance<() => void>;
let load: MockInstance<() => void>;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return { host, rerender: (next: ReactElement) => act(() => root!.render(next)) };
}

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  load = vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete (navigator as { mediaSession?: unknown }).mediaSession;
  delete (globalThis as { MediaMetadata?: unknown }).MediaMetadata;
});

const STATIONS: StreamingStation[] = [
  { id: "jazz", name: "Jazz FM", src: "https://ice.example.com/jazz", genre: "Jazz" },
  { id: "talk", name: "Talk Radio", src: "https://ice.example.com/talk" },
  { id: "ep1", name: "Episode 1", src: "/media/episode-1.mp3" },
];

const OFF: StreamingAudioValue = { stationId: "jazz", playing: false, volume: 0.8, muted: false };

/** A parent that owns the value, as a real app would. */
function Harness(
  props: Omit<StreamingAudioProps, "value" | "onChange" | "stations"> & {
    stations?: StreamingStation[];
    initial?: StreamingAudioValue;
    spy?: (next: StreamingAudioValue) => void;
  },
) {
  const { initial = OFF, spy, stations = STATIONS, ...rest } = props;
  const [value, setValue] = useState<StreamingAudioValue>(initial);
  return (
    <StreamingAudio
      {...rest}
      stations={stations}
      value={value}
      onChange={(next) => {
        spy?.(next);
        setValue(next);
      }}
    />
  );
}

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const audio = () => q<HTMLAudioElement>("audio")!;
const control = <T extends Element = HTMLElement>(name: string) =>
  q<T>(`[data-streaming-control="${name}"]`);
const playButton = () => control<HTMLButtonElement>("play")!;
const liveRegion = () => q("[data-streaming-live]")!;

/** Let resolved / rejected play() promises settle inside act. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function fire(el: Element, type: string) {
  act(() => {
    el.dispatchEvent(new Event(type));
  });
}

function setRange(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function selectStation(id: string) {
  const select = control<HTMLSelectElement>("station")!;
  act(() => {
    select.value = id;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("kind guess", () => {
  it("is file for a URL ending in an audio file extension", () => {
    expect(guessStationKind("/media/episode-1.mp3")).toBe("file");
    expect(guessStationKind("https://cdn.example.com/a/b.MP3")).toBe("file");
    expect(guessStationKind("https://cdn.example.com/a/b.m4a?token=1")).toBe("file");
    expect(guessStationKind("https://cdn.example.com/a/b.ogg#t=10")).toBe("file");
    expect(guessStationKind("https://cdn.example.com/a/b.opus")).toBe("file");
    expect(guessStationKind("https://cdn.example.com/a/b.flac")).toBe("file");
  });

  it("is live for anything else", () => {
    expect(guessStationKind("https://ice.example.com/jazz")).toBe("live");
    expect(guessStationKind("https://ice.example.com:8000/;")).toBe("live");
    expect(guessStationKind("https://ice.example.com/mp3/")).toBe("live");
    expect(guessStationKind("https://ice.example.com/listen.pls")).toBe("live");
  });

  it("shows the LIVE badge for a guessed-live station and not for a file", () => {
    const { rerender } = mount(<StreamingAudio stations={STATIONS} value={OFF} onChange={() => {}} />);
    expect(q("[data-streaming-live-badge]")?.textContent).toBe("LIVE");
    expect(q("[data-react-fancy-streaming-audio]")!.getAttribute("data-streaming-kind")).toBe("live");

    rerender(<StreamingAudio stations={STATIONS} value={{ ...OFF, stationId: "ep1" }} onChange={() => {}} />);
    expect(q("[data-streaming-live-badge]")).toBeNull();
    expect(q("[data-react-fancy-streaming-audio]")!.getAttribute("data-streaming-kind")).toBe("file");
  });

  it("lets an explicit kind win over the guess (an Icecast mount named .mp3)", () => {
    mount(
      <StreamingAudio
        stations={[{ id: "m", name: "Mount", src: "https://ice.example.com/stream.mp3", kind: "live" }]}
        value={{ ...OFF, stationId: "m" }}
        onChange={() => {}}
      />,
    );
    expect(q("[data-streaming-live-badge]")).not.toBeNull();
    expect(control("seek")).toBeNull();
  });
});

describe("src scheme refusal", () => {
  it("plays only http(s) and same-origin relative addresses", () => {
    expect(isPlayableSrc("https://ice.example.com/jazz")).toBe(true);
    expect(isPlayableSrc("HTTP://ice.example.com/jazz")).toBe(true);
    expect(isPlayableSrc("/media/a.mp3")).toBe(true);
    expect(isPlayableSrc("media/a.mp3")).toBe(true);
    expect(isPlayableSrc("./a.mp3")).toBe(true);

    expect(isPlayableSrc("")).toBe(false);
    expect(isPlayableSrc("javascript:alert(1)")).toBe(false);
    expect(isPlayableSrc(" javascript:alert(1)")).toBe(false);
    expect(isPlayableSrc("java\tscript:alert(1)")).toBe(false);
    expect(isPlayableSrc("data:audio/mpeg;base64,AAAA")).toBe(false);
    expect(isPlayableSrc("blob:https://app.example.com/1234")).toBe(false);
    expect(isPlayableSrc("file:///etc/passwd")).toBe(false);
    expect(isPlayableSrc("ftp://ftp.example.com/a.mp3")).toBe(false);
    // Not same-origin: protocol-relative, and the backslash forms a URL parser
    // treats as protocol-relative.
    expect(isPlayableSrc("//evil.example.com/a.mp3")).toBe(false);
    expect(isPlayableSrc("/\\evil.example.com/a.mp3")).toBe(false);
    expect(isPlayableSrc("\\\\evil.example.com/a.mp3")).toBe(false);
  });

  it("never hands a refused src to the audio element, shows the error and reports it", async () => {
    const onError = vi.fn();
    const spy = vi.fn();
    mount(
      <Harness
        stations={[{ id: "bad", name: "Bad", src: "javascript:alert(1)" }]}
        initial={{ ...OFF, stationId: "bad", playing: true }}
        spy={spy}
        onError={onError}
      />,
    );
    await flush();

    expect(audio().hasAttribute("src")).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(q("[data-streaming-error]")?.textContent).toContain("can't be played");
    expect(onError).toHaveBeenCalledWith("bad", "refused");
    expect(onError).toHaveBeenCalledTimes(1);
    // The value no longer claims to be playing.
    expect(spy).toHaveBeenLastCalledWith({ stationId: "bad", playing: false, volume: 0.8, muted: false });
  });
});

describe("controlled play / pause", () => {
  it("asks for playing through onChange and plays only once the value says so", async () => {
    const spy = vi.fn();
    mount(<Harness spy={spy} />);
    expect(play).not.toHaveBeenCalled();

    act(() => playButton().click());
    await flush();

    expect(spy).toHaveBeenCalledWith({ ...OFF, playing: true });
    expect(audio().getAttribute("src")).toBe("https://ice.example.com/jazz");
    expect(play).toHaveBeenCalledTimes(1);
    expect(playButton().getAttribute("aria-label")).toBe("Pause");

    act(() => playButton().click());
    await flush();
    expect(spy).toHaveBeenLastCalledWith({ ...OFF, playing: false });
    expect(pause).toHaveBeenCalled();
    expect(playButton().getAttribute("aria-label")).toBe("Play");
  });

  it("is truly controlled: a parent that ignores onChange keeps it paused", async () => {
    const onChange = vi.fn();
    mount(<StreamingAudio stations={STATIONS} value={OFF} onChange={onChange} />);
    act(() => playButton().click());
    await flush();

    expect(onChange).toHaveBeenCalledWith({ ...OFF, playing: true });
    expect(play).not.toHaveBeenCalled();
    expect(playButton().getAttribute("aria-label")).toBe("Play");
  });

  it("switching stations while playing keeps playing on the new station", async () => {
    const spy = vi.fn();
    mount(<Harness spy={spy} initial={{ ...OFF, playing: true }} />);
    await flush();
    expect(play).toHaveBeenCalledTimes(1);

    selectStation("talk");
    await flush();

    expect(spy).toHaveBeenLastCalledWith({ ...OFF, stationId: "talk", playing: true });
    expect(audio().getAttribute("src")).toBe("https://ice.example.com/talk");
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("announces the station change in a polite live region", async () => {
    mount(<Harness />);
    expect(liveRegion().getAttribute("aria-live")).toBe("polite");
    expect(liveRegion().textContent).toBe("");

    selectStation("talk");
    await flush();
    expect(liveRegion().textContent).toContain("Talk Radio");
  });
});

describe("autoplay policy", () => {
  it("turns a NotAllowedError into playing: false and a press-play hint, once", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    const spy = vi.fn();
    const onError = vi.fn();
    mount(<Harness spy={spy} onError={onError} initial={{ ...OFF, playing: true }} />);
    await flush();
    await flush();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ ...OFF, playing: false });
    expect(play).toHaveBeenCalledTimes(1);
    expect(q("[data-streaming-hint]")?.textContent).toBe("Press play to listen");
    expect(onError).toHaveBeenCalledWith("jazz", "blocked");

    // A press clears the hint and plays.
    play.mockImplementation(() => Promise.resolve());
    act(() => playButton().click());
    await flush();
    expect(q("[data-streaming-hint]")).toBeNull();
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("does not loop when the parent ignores the playing: false", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    const onChange = vi.fn();
    mount(<StreamingAudio stations={STATIONS} value={{ ...OFF, playing: true }} onChange={onChange} />);
    await flush();
    await flush();
    await flush();

    expect(play).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores an AbortError from an interrupted play()", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("interrupted", "AbortError")));
    const spy = vi.fn();
    mount(<Harness spy={spy} initial={{ ...OFF, playing: true }} />);
    await flush();
    expect(spy).not.toHaveBeenCalled();
    expect(q("[data-streaming-hint]")).toBeNull();
  });
});

describe("live streams", () => {
  it("drops the connection on pause and reconnects from live on play", async () => {
    mount(<Harness initial={{ ...OFF, playing: true }} />);
    await flush();
    expect(audio().getAttribute("src")).toBe("https://ice.example.com/jazz");

    load.mockClear();
    act(() => playButton().click());
    await flush();

    expect(pause).toHaveBeenCalled();
    expect(audio().hasAttribute("src")).toBe(false);
    // load() after removing src is what actually closes the connection.
    expect(load).toHaveBeenCalled();

    load.mockClear();
    play.mockClear();
    act(() => playButton().click());
    await flush();
    expect(audio().getAttribute("src")).toBe("https://ice.example.com/jazz");
    expect(load).toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("a file keeps its src (and so its position) on pause", async () => {
    mount(<Harness initial={{ ...OFF, stationId: "ep1", playing: true }} />);
    await flush();
    act(() => playButton().click());
    await flush();
    expect(pause).toHaveBeenCalled();
    expect(audio().getAttribute("src")).toBe("/media/episode-1.mp3");
  });

  it("retries with backoff, three times at most, then shows the error state", async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const onError = vi.fn();
    mount(<Harness spy={spy} onError={onError} initial={{ ...OFF, playing: true }} />);
    await flush();
    expect(play).toHaveBeenCalledTimes(1);

    // Retry 1 after 1s.
    fire(audio(), "error");
    expect(q("[data-streaming-status]")?.textContent).toBe("Reconnecting...");
    act(() => vi.advanceTimersByTime(999));
    expect(play).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    await flush();
    expect(play).toHaveBeenCalledTimes(2);

    // Retry 2 after 2s, on a stall this time.
    fire(audio(), "stalled");
    act(() => vi.advanceTimersByTime(1999));
    expect(play).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(1));
    await flush();
    expect(play).toHaveBeenCalledTimes(3);

    // Retry 3 after 4s.
    fire(audio(), "error");
    act(() => vi.advanceTimersByTime(3999));
    expect(play).toHaveBeenCalledTimes(3);
    act(() => vi.advanceTimersByTime(1));
    await flush();
    expect(play).toHaveBeenCalledTimes(4);
    expect(onError).not.toHaveBeenCalled();

    // A fourth failure gives up.
    fire(audio(), "error");
    await flush();
    act(() => vi.advanceTimersByTime(60_000));
    await flush();
    expect(play).toHaveBeenCalledTimes(4);
    expect(q("[data-streaming-error]")?.textContent).toBe("Couldn't connect to Jazz FM.");
    expect(liveRegion().textContent).toContain("Couldn't connect to Jazz FM.");
    expect(onError).toHaveBeenCalledWith("jazz", "failed");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith({ ...OFF, playing: false });
  });

  it("a successful reconnect resets the retry budget", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    mount(<Harness onError={onError} initial={{ ...OFF, playing: true }} />);
    await flush();

    for (let round = 0; round < 3; round++) {
      fire(audio(), "error");
      act(() => vi.advanceTimersByTime(1000));
      await flush();
      fire(audio(), "playing");
    }
    // Every round waited only the first backoff step, and nothing gave up.
    expect(play).toHaveBeenCalledTimes(4);
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignores errors while paused (a dropped connection is not a failure)", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    mount(<Harness onError={onError} />);
    fire(audio(), "error");
    act(() => vi.advanceTimersByTime(10_000));
    await flush();
    expect(play).not.toHaveBeenCalled();
    expect(q("[data-streaming-error]")).toBeNull();
  });
});

describe("files: elapsed, duration and seek", () => {
  function fakeTime(el: HTMLAudioElement, duration: number) {
    let t = 0;
    Object.defineProperty(el, "duration", { configurable: true, get: () => duration });
    Object.defineProperty(el, "currentTime", {
      configurable: true,
      get: () => t,
      set: (v: number) => {
        t = v;
      },
    });
    return { setTime: (v: number) => (t = v) };
  }

  it("shows elapsed / duration and seeks a file", () => {
    mount(<Harness initial={{ ...OFF, stationId: "ep1" }} />);
    const el = audio();
    const clock = fakeTime(el, 125);
    fire(el, "durationchange");
    clock.setTime(30);
    fire(el, "timeupdate");

    expect(q("[data-streaming-time]")?.textContent).toBe("0:30 / 2:05");
    const seek = control("seek")!.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(seek).not.toBeNull();
    expect(seek.max).toBe("125");

    setRange(seek, "90");
    expect(el.currentTime).toBe(90);
  });

  it("offers no seek and no time on a live stream", () => {
    mount(<Harness />);
    expect(control("seek")).toBeNull();
    expect(q("[data-streaming-time]")).toBeNull();
  });
});

describe("volume and mute", () => {
  it("reports volume through onChange and applies the value to the element", () => {
    const spy = vi.fn();
    mount(<Harness spy={spy} />);
    expect(audio().volume).toBeCloseTo(0.8);

    const slider = control("volume")!.querySelector<HTMLInputElement>('input[type="range"]')!;
    setRange(slider, "50");
    expect(spy).toHaveBeenLastCalledWith({ ...OFF, volume: 0.5 });
    expect(audio().volume).toBeCloseTo(0.5);
  });

  it("toggles mute as a pressed button", () => {
    const spy = vi.fn();
    mount(<Harness spy={spy} />);
    const mute = control<HTMLButtonElement>("mute")!;
    expect(mute.getAttribute("aria-pressed")).toBe("false");

    act(() => mute.click());
    expect(spy).toHaveBeenLastCalledWith({ ...OFF, muted: true });
    expect(audio().muted).toBe(true);
    expect(mute.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("labels", () => {
  it("overrides every visible string it is given", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    mount(
      <Harness
        initial={{ ...OFF, playing: true }}
        labels={{ play: "Lecture", live: "EN DIRECT", pressPlay: "Appuyez sur lecture", mute: "Muet", station: "Chaine" }}
      />,
    );
    await flush();
    await flush();

    expect(playButton().getAttribute("aria-label")).toBe("Lecture");
    expect(q("[data-streaming-live-badge]")?.textContent).toBe("EN DIRECT");
    expect(q("[data-streaming-hint]")?.textContent).toBe("Appuyez sur lecture");
    expect(control("mute")!.getAttribute("aria-label")).toBe("Muet");
    const select = control<HTMLSelectElement>("station")!;
    expect(document.querySelector(`label[for="${select.id}"]`)?.textContent).toContain("Chaine");
  });

  it("fills {station} in the failure message", async () => {
    vi.useFakeTimers();
    mount(
      <Harness
        stations={[{ id: "ep1", name: "Episode 1", src: "/media/episode-1.mp3" }]}
        initial={{ ...OFF, stationId: "ep1", playing: true }}
        labels={{ failed: "Echec: {station}" }}
      />,
    );
    await flush();
    // A file does not retry: one error is the failure.
    fire(audio(), "error");
    await flush();
    expect(q("[data-streaming-error]")?.textContent).toBe("Echec: Episode 1");
  });
});

describe("display", () => {
  it("shows the station name and the host-supplied nowPlaying", () => {
    mount(<Harness nowPlaying="Miles Davis - So What" />);
    expect(q("[data-streaming-station-name]")?.textContent).toBe("Jazz FM");
    expect(q("[data-streaming-now-playing]")?.textContent).toBe("Miles Davis - So What");
    expect(q("[data-react-fancy-streaming-audio]")!.getAttribute("data-streaming-station")).toBe("jazz");
  });

  it("records the layout", () => {
    mount(<Harness layout="compact" />);
    expect(q("[data-react-fancy-streaming-audio]")!.getAttribute("data-layout")).toBe("compact");
  });
});

describe("Media Session", () => {
  it("publishes metadata and play/pause handlers when the API exists", async () => {
    const handlers = new Map<string, (() => void) | null>();
    const session = {
      metadata: null as unknown,
      playbackState: "none",
      setActionHandler: vi.fn((action: string, fn: (() => void) | null) => {
        handlers.set(action, fn);
      }),
    };
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class {
      constructor(public init: Record<string, unknown>) {}
    };

    const spy = vi.fn();
    mount(<Harness spy={spy} nowPlaying="So What" />);
    await flush();

    expect((session.metadata as { init: Record<string, unknown> }).init).toMatchObject({
      title: "So What",
      artist: "Jazz FM",
    });
    expect(session.playbackState).toBe("paused");
    expect(handlers.get("play")).toBeTypeOf("function");
    expect(handlers.get("pause")).toBeTypeOf("function");

    act(() => handlers.get("play")!());
    await flush();
    expect(spy).toHaveBeenLastCalledWith({ ...OFF, playing: true });
    expect(session.playbackState).toBe("playing");

    act(() => root!.unmount());
    root = null;
    expect(handlers.get("play")).toBeNull();
    expect(handlers.get("pause")).toBeNull();
  });

  it("is tolerated when absent", async () => {
    expect("mediaSession" in navigator).toBe(false);
    mount(<Harness nowPlaying="x" initial={{ ...OFF, playing: true }} />);
    await flush();
    expect(play).toHaveBeenCalledTimes(1);
  });
});

describe("contract", () => {
  it("forwards a ref to the root and audioRef to the element", () => {
    const ref = createRef<HTMLDivElement>();
    const audioRef = createRef<HTMLAudioElement>();
    mount(<StreamingAudio ref={ref} audioRef={audioRef} id="radio" stations={STATIONS} value={OFF} onChange={() => {}} />);
    expect(ref.current?.hasAttribute("data-react-fancy-streaming-audio")).toBe(true);
    expect(ref.current?.id).toBe("radio");
    expect(audioRef.current).toBe(audio());
  });

  it("every control is a native, focusable element with an accessible name", () => {
    mount(<Harness initial={{ ...OFF, stationId: "ep1" }} />);
    const names: Record<string, string> = {};
    for (const handle of ["station", "play", "mute", "volume", "seek"]) {
      const holder = control(handle);
      expect(holder, handle).not.toBeNull();
      const el = holder!.matches("button, select, input")
        ? holder!
        : holder!.querySelector<HTMLElement>("button, select, input")!;
      expect(el.tabIndex, `${handle} focusable`).toBeGreaterThanOrEqual(0);
      const name =
        el.getAttribute("aria-label") ??
        document.querySelector(`label[for="${el.id}"]`)?.textContent ??
        "";
      expect(name.trim(), `${handle} name`).not.toBe("");
      names[handle] = name.trim();
    }
    expect(names).toMatchObject({ station: "Station", play: "Play", mute: "Mute", volume: "Volume", seek: "Seek" });
  });

  it("never renders native audio controls or autoplay", () => {
    mount(<Harness />);
    expect(audio().hasAttribute("controls")).toBe(false);
    expect(audio().hasAttribute("autoplay")).toBe(false);
    expect(audio().getAttribute("preload")).toBe("none");
  });
});
