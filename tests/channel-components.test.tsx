// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LiveBadge } from "../src/components/LiveBadge";
import { TrackItem } from "../src/components/TrackItem";
import { NowPlaying } from "../src/components/NowPlaying";
import { ChannelGuide } from "../src/components/ChannelGuide";
import { Playlist } from "../src/components/Playlist";
import { MediaQueue } from "../src/components/MediaQueue";
import { MediaEmbed } from "../src/components/MediaEmbed";
import { createChannelValue, selectChannel } from "../src/utils/media-channel";
import { registerEmbedProvider } from "../src/utils/media-sources";
import type { Channel, ChannelPlayerValue, MediaTrack, PendingQueueEdit } from "../src/utils/media-channel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The channel component set (Unreleased): everything around the player. Each
 * is driven through the shared ChannelPlayerValue, and found by its data-*
 * handle, never by text or DOM position.
 */

let root: Root | null = null;
const cleanups: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return { host, rerender: (next: ReactElement) => act(() => root!.render(next)) };
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const qa = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const click = (el: Element | null) => {
  expect(el).not.toBeNull();
  act(() => (el as HTMLElement).click());
};

const t = (id: string, extra: Partial<MediaTrack> = {}): MediaTrack => ({
  id,
  title: `Song ${id.toUpperCase()}`,
  artist: "The Band",
  duration: 185,
  source: { type: "file", url: `/media/${id}.mp3` },
  ...extra,
});

const SINGLE: Channel = { id: "single", name: "One song", kind: "track", track: t("a") };
const LIST: Channel = { id: "list", name: "Mixtape", kind: "playlist", tracks: [t("a"), t("b"), t("c")] };
const LIVE: Channel = {
  id: "live",
  name: "Riverside Radio",
  kind: "live",
  source: { type: "stream", url: "https://ice.example.com/live" },
  nowPlaying: "Morning show",
};
const CHANNELS = [SINGLE, LIST, LIVE];

describe("LiveBadge", () => {
  it("says LIVE by default and carries its status", () => {
    mount(<LiveBadge />);
    expect(q("[data-react-fancy-live-badge]")?.textContent).toBe("LIVE");
    expect(q("[data-react-fancy-live-badge]")?.getAttribute("data-live-status")).toBe("live");
  });

  it("names every status, and takes labels", () => {
    const { rerender } = mount(<LiveBadge status="offline" />);
    expect(q("[data-react-fancy-live-badge]")?.textContent).toBe("Offline");
    rerender(<LiveBadge status="starting" labels={{ starting: "Bientot" }} />);
    expect(q("[data-react-fancy-live-badge]")?.textContent).toBe("Bientot");
    rerender(<LiveBadge status="ended" />);
    expect(q("[data-react-fancy-live-badge]")?.getAttribute("data-live-status")).toBe("ended");
  });
});

describe("TrackItem", () => {
  it("shows title, artist and duration, and selects by id", () => {
    const onSelect = vi.fn();
    mount(<TrackItem track={t("a")} onSelect={onSelect} />);
    const row = q("[data-react-fancy-track-item]")!;
    expect(row.getAttribute("data-track-id")).toBe("a");
    expect(row.textContent).toContain("Song A");
    expect(row.textContent).toContain("The Band");
    expect(q("[data-track-duration]")?.textContent).toBe("3:05");
    click(q("[data-track-select]"));
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("marks the current track, and says when it is playing", () => {
    mount(<TrackItem track={t("a")} active playing />);
    const row = q("[data-react-fancy-track-item]")!;
    expect(row.getAttribute("data-active")).toBe("true");
    expect(q("[data-track-now-playing]")?.textContent).toBe("Now playing");
  });

  it("has no button when it cannot be selected", () => {
    mount(<TrackItem track={t("a")} />);
    expect(q("[data-track-select]")?.tagName).not.toBe("BUTTON");
  });
});

describe("NowPlaying", () => {
  it("shows the track and its channel", () => {
    mount(<NowPlaying channel={LIST} track={t("b")} />);
    const el = q("[data-react-fancy-now-playing]")!;
    expect(el.textContent).toContain("Song B");
    expect(el.textContent).toContain("The Band");
    expect(el.textContent).toContain("Mixtape");
  });

  it("shows a live channel's name, what is on air and its badge", () => {
    mount(<NowPlaying channel={LIVE} />);
    const el = q("[data-react-fancy-now-playing]")!;
    expect(el.textContent).toContain("Riverside Radio");
    expect(el.textContent).toContain("Morning show");
    expect(q("[data-react-fancy-live-badge]")).not.toBeNull();
  });

  it("says nothing is playing without a channel", () => {
    mount(<NowPlaying />);
    expect(q("[data-react-fancy-now-playing]")?.textContent).toContain("Nothing playing");
  });
});

function GuideHarness({ spy, initial }: { spy?: (v: ChannelPlayerValue) => void; initial?: ChannelPlayerValue }) {
  const [value, setValue] = useState(initial ?? createChannelValue());
  return (
    <ChannelGuide
      channels={CHANNELS}
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

describe("ChannelGuide", () => {
  it("lists every channel with its kind", () => {
    mount(<GuideHarness />);
    const items = qa("[data-channel-guide-item]");
    expect(items.map((i) => i.getAttribute("data-channel-guide-item"))).toEqual(["single", "list", "live"]);
    expect(items.map((i) => i.getAttribute("data-channel-kind"))).toEqual(["track", "playlist", "live"]);
    expect(items[1]!.textContent).toContain("Playlist, 3 tracks");
    expect(items[0]!.textContent).toContain("Single");
    expect(items[2]!.querySelector("[data-react-fancy-live-badge]")).not.toBeNull();
    expect(items[2]!.textContent).toContain("Morning show");
  });

  it("tunes in on click, keeping playing, and marks the current channel", () => {
    const spy = vi.fn();
    mount(<GuideHarness spy={spy} initial={{ ...createChannelValue(), playing: true }} />);
    click(q('[data-channel-guide-item="list"] button'));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ channelId: "list", trackId: "a", playing: true }));
    expect(q('[data-channel-guide-item="list"] button')?.getAttribute("aria-current")).toBe("true");
    expect(q('[data-channel-guide-item="live"] button')?.hasAttribute("aria-current")).toBe(false);
  });

  it("is a named list", () => {
    mount(<GuideHarness />);
    const guide = q("[data-react-fancy-channel-guide]")!;
    expect(guide.getAttribute("aria-label")).toBe("Channels");
  });
});

function PlaylistHarness(props: {
  channel?: Channel;
  initial?: ChannelPlayerValue;
  editable?: boolean;
  library?: MediaTrack[];
  pending?: PendingQueueEdit[];
  onResolve?: (id: string, accepted: boolean) => void;
  spy?: (v: ChannelPlayerValue) => void;
  tracksSpy?: (channelId: string, tracks: MediaTrack[]) => void;
}) {
  const [channel, setChannel] = useState<Channel>(props.channel ?? LIST);
  const [value, setValue] = useState(props.initial ?? selectChannel(createChannelValue(), channel));
  const [pending, setPending] = useState(props.pending ?? []);
  return (
    <Playlist
      channel={channel}
      value={value}
      onChange={(v) => {
        props.spy?.(v);
        setValue(v);
      }}
      onTracksChange={
        props.editable === false
          ? undefined
          : (id, tracks) => {
              props.tracksSpy?.(id, tracks);
              setChannel((c) => ({ ...(c as Extract<Channel, { kind: "playlist" }>), tracks }));
            }
      }
      library={props.library}
      pendingEdits={pending}
      onResolvePending={(id, accepted) => {
        props.onResolve?.(id, accepted);
        setPending((p) => p.filter((e) => e.id !== id));
      }}
    />
  );
}

const order = () => qa("[data-playlist-track]").map((r) => r.getAttribute("data-playlist-track"));

describe("Playlist", () => {
  it("lists the tracks and marks the current one", () => {
    mount(<PlaylistHarness />);
    expect(order()).toEqual(["a", "b", "c"]);
    expect(q('[data-playlist-track="a"]')?.getAttribute("aria-current")).toBe("true");
  });

  it("plays a track on select", () => {
    const spy = vi.fn();
    mount(<PlaylistHarness spy={spy} />);
    click(q('[data-playlist-track="c"] [data-track-select]'));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ channelId: "list", trackId: "c", position: 0 }));
  });

  it("switches to its channel when the value is on another", () => {
    const spy = vi.fn();
    mount(<PlaylistHarness spy={spy} initial={selectChannel(createChannelValue(), LIVE)} />);
    click(q('[data-playlist-track="b"] [data-track-select]'));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ channelId: "list", trackId: "b" }));
  });

  it("reorders with Move up / Move down, which are disabled at the ends", () => {
    const tracksSpy = vi.fn();
    mount(<PlaylistHarness tracksSpy={tracksSpy} />);
    expect(q<HTMLButtonElement>('[data-playlist-track="a"] [data-playlist-action="up"]')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-playlist-track="c"] [data-playlist-action="down"]')!.disabled).toBe(true);
    click(q('[data-playlist-track="a"] [data-playlist-action="down"]'));
    expect(tracksSpy).toHaveBeenLastCalledWith("list", expect.any(Array));
    expect(order()).toEqual(["b", "a", "c"]);
    click(q('[data-playlist-track="c"] [data-playlist-action="up"]'));
    expect(order()).toEqual(["b", "c", "a"]);
  });

  it("names its buttons after the track", () => {
    mount(<PlaylistHarness />);
    expect(q('[data-playlist-track="b"] [data-playlist-action="remove"]')?.getAttribute("aria-label")).toBe("Remove Song B");
    expect(q('[data-playlist-track="b"] [data-playlist-action="up"]')?.getAttribute("aria-label")).toBe("Move Song B up");
  });

  it("removes a track, and moves the current one along when it was removed", () => {
    const spy = vi.fn();
    mount(<PlaylistHarness spy={spy} />);
    click(q('[data-playlist-track="a"] [data-playlist-action="remove"]'));
    expect(order()).toEqual(["b", "c"]);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: "b" }));
  });

  it("is read-only without onTracksChange", () => {
    mount(<PlaylistHarness editable={false} />);
    expect(q("[data-playlist-action=remove]")).toBeNull();
    expect(q("[data-playlist-action=up]")).toBeNull();
    expect(q("[data-playlist-action=add]")).toBeNull();
  });

  it("adds from a library, offering only tracks not already in the list", () => {
    mount(<PlaylistHarness library={[t("a"), t("d"), t("e")]} />);
    const select = q<HTMLSelectElement>("[data-playlist-library] select")!;
    const options = [...select.options].map((o) => o.value).filter(Boolean);
    expect(options).toEqual(["d", "e"]);
    act(() => {
      select.value = "e";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    click(q("[data-playlist-action=add]"));
    expect(order()).toEqual(["a", "b", "c", "e"]);
  });

  it("toggles shuffle and cycles repeat through the value", () => {
    const spy = vi.fn();
    mount(<PlaylistHarness spy={spy} />);
    const shuffle = q("[data-playlist-action=shuffle]")!;
    expect(shuffle.getAttribute("aria-pressed")).toBe("false");
    click(shuffle);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ shuffle: true, order: expect.any(Array) }));
    expect(q("[data-playlist-action=shuffle]")?.getAttribute("aria-pressed")).toBe("true");
    const repeat = q("[data-playlist-action=repeat]")!;
    expect(repeat.getAttribute("data-repeat")).toBe("off");
    click(repeat);
    expect(q("[data-playlist-action=repeat]")?.getAttribute("data-repeat")).toBe("all");
  });

  it("shows a staged removal in place; nothing changes until it is accepted", () => {
    const onResolve = vi.fn();
    const tracksSpy = vi.fn();
    mount(
      <PlaylistHarness
        tracksSpy={tracksSpy}
        onResolve={onResolve}
        pending={[{ id: "p1", op: "remove", trackId: "b" }]}
      />,
    );
    expect(q('[data-playlist-track="b"]')?.getAttribute("data-playlist-pending")).toBe("remove");
    expect(order()).toEqual(["a", "b", "c"]);
    click(q('[data-playlist-track="b"] [data-playlist-action="accept"]'));
    expect(onResolve).toHaveBeenCalledWith("p1", true);
    expect(order()).toEqual(["a", "c"]);
  });

  it("rejecting a staged edit changes nothing", () => {
    const onResolve = vi.fn();
    const tracksSpy = vi.fn();
    mount(<PlaylistHarness tracksSpy={tracksSpy} onResolve={onResolve} pending={[{ id: "p2", op: "clear" }]} />);
    expect(q("[data-playlist-pending-banner]")?.getAttribute("data-playlist-pending")).toBe("clear");
    click(q("[data-playlist-pending-banner] [data-playlist-action=reject]"));
    expect(onResolve).toHaveBeenCalledWith("p2", false);
    expect(tracksSpy).not.toHaveBeenCalled();
    expect(order()).toEqual(["a", "b", "c"]);
  });

  it("shows a single-track channel as its one track, with no reorder", () => {
    mount(<PlaylistHarness channel={SINGLE} />);
    expect(order()).toEqual(["a"]);
    expect(q("[data-playlist-action=up]")).toBeNull();
    expect(q("[data-playlist-action=shuffle]")).toBeNull();
  });
});

describe("MediaQueue", () => {
  function QueueHarness({ initial, spy, limit }: { initial: ChannelPlayerValue; spy?: (v: ChannelPlayerValue) => void; limit?: number }) {
    const [value, setValue] = useState(initial);
    return (
      <MediaQueue
        channel={LIST}
        value={value}
        limit={limit}
        onChange={(v) => {
          spy?.(v);
          setValue(v);
        }}
      />
    );
  }
  const queued = () => qa("[data-queue-track]").map((r) => r.getAttribute("data-queue-track"));

  it("lists what plays next, in play order", () => {
    mount(<QueueHarness initial={selectChannel(createChannelValue(), LIST)} />);
    expect(queued()).toEqual(["b", "c"]);
  });

  it("follows the shuffle order and the limit", () => {
    const v = { ...selectChannel(createChannelValue(), LIST), shuffle: true, order: ["a", "c", "b"] };
    const { rerender } = mount(<QueueHarness initial={v} />);
    expect(queued()).toEqual(["c", "b"]);
    rerender(<QueueHarness initial={v} limit={1} />);
    expect(queued()).toEqual(["c"]);
  });

  it("jumps to a queued track", () => {
    const spy = vi.fn();
    mount(<QueueHarness initial={selectChannel(createChannelValue(), LIST)} spy={spy} />);
    click(q('[data-queue-track="c"] [data-track-select]'));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ trackId: "c" }));
  });

  it("says when nothing is up next", () => {
    mount(<QueueHarness initial={{ ...selectChannel(createChannelValue(), LIST), trackId: "c" }} />);
    expect(q("[data-queue-empty]")?.textContent).toBe("Nothing up next");
  });
});

describe("MediaEmbed", () => {
  const YT = { type: "embed" as const, provider: "youtube", id: "dQw4w9WgXcQ" };

  it("loads nothing from the provider until played: a poster first", () => {
    const onPlayingChange = vi.fn();
    mount(<MediaEmbed source={YT} playing={false} title="Launch stream" onPlayingChange={onPlayingChange} />);
    expect(q("iframe")).toBeNull();
    const poster = q("[data-embed-poster]")!;
    expect(poster.getAttribute("aria-label")).toBe("Play Launch stream on YouTube");
    click(poster);
    expect(onPlayingChange).toHaveBeenCalledWith(true);
  });

  it("loads the provider's player, autoplaying, once playing", () => {
    mount(<MediaEmbed source={YT} playing title="Launch stream" />);
    const frame = q<HTMLIFrameElement>("iframe")!;
    expect(frame.getAttribute("src")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&playsinline=1&autoplay=1");
    expect(frame.getAttribute("title")).toBe("Launch stream");
    expect(frame.getAttribute("allow")).toContain("autoplay");
    expect(frame.getAttribute("sandbox")).toContain("allow-scripts");
    expect(frame.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(q("[data-react-fancy-media-embed]")?.getAttribute("data-embed-provider")).toBe("youtube");
  });

  it("drives play / pause through the provider once loaded", () => {
    const command = vi.fn();
    cleanups.push(registerEmbedProvider({ id: "mine", title: "Mine", embedUrl: (s) => `https://video.example.com/e/${s.id}`, command }));
    const src = { type: "embed" as const, provider: "mine", id: "42" };
    const { rerender } = mount(<MediaEmbed source={src} playing />);
    rerender(<MediaEmbed source={src} playing={false} />);
    expect(command).toHaveBeenLastCalledWith(expect.any(HTMLIFrameElement), "pause");
    rerender(<MediaEmbed source={src} playing />);
    expect(command).toHaveBeenLastCalledWith(expect.any(HTMLIFrameElement), "play");
  });

  it("refuses an unknown provider or a bad id, and says so", () => {
    const onError = vi.fn();
    const { rerender } = mount(<MediaEmbed source={{ type: "embed", provider: "nope", id: "x" }} playing onError={onError} />);
    expect(q("iframe")).toBeNull();
    expect(q("[data-embed-error]")?.textContent).toBe("This video can't be embedded.");
    expect(onError).toHaveBeenCalledTimes(1);
    rerender(<MediaEmbed source={{ type: "embed", provider: "youtube", id: "not valid!" }} playing onError={onError} />);
    expect(q("iframe")).toBeNull();
  });
});
