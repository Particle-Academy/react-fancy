import { describe, expect, it } from "vitest";
import {
  addTrack,
  applyQueueEdit,
  channelTracks,
  createChannelValue,
  currentTrack,
  cycleRepeat,
  moveTrack,
  nextTrack,
  playOrder,
  previousTrack,
  reconcileValue,
  removeTrack,
  selectChannel,
  selectTrack,
  shuffleIds,
  toggleShuffle,
  trackEnded,
  upNext,
} from "../src/utils/media-channel";
import type { Channel, ChannelPlayerValue, MediaTrack } from "../src/utils/media-channel";

/**
 * The channel model's state transitions (Channels, Unreleased). Every channel
 * component AND the planned registerMediaBridge make their moves through these
 * pure functions, so the UI and an agent cannot disagree about what "next" or
 * "remove" means.
 */

const t = (id: string): MediaTrack => ({ id, title: id.toUpperCase(), source: { type: "file", url: `/media/${id}.mp3` } });
const A = t("a");
const B = t("b");
const C = t("c");

const SINGLE: Channel = { id: "single", name: "One song", kind: "track", track: A };
const LIST: Channel = { id: "list", name: "Mixtape", kind: "playlist", tracks: [A, B, C] };
const LIVE: Channel = { id: "live", name: "Radio", kind: "live", source: { type: "stream", url: "https://ice.example.com/live" } };

/** A deterministic "random": always picks index 0 in Fisher-Yates. */
const zero = () => 0;

function on(channel: Channel, patch: Partial<ChannelPlayerValue> = {}): ChannelPlayerValue {
  return { ...selectChannel(createChannelValue(), channel), ...patch };
}

describe("channelTracks / createChannelValue", () => {
  it("gives one track for a track channel, the list for a playlist, none for live", () => {
    expect(channelTracks(SINGLE).map((x) => x.id)).toEqual(["a"]);
    expect(channelTracks(LIST).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(channelTracks(LIVE)).toEqual([]);
    expect(channelTracks(undefined)).toEqual([]);
  });

  it("starts idle, unmuted, not shuffled, repeat off", () => {
    expect(createChannelValue()).toEqual({
      channelId: null,
      trackId: null,
      playing: false,
      position: 0,
      volume: 1,
      muted: false,
      shuffle: false,
      repeat: "off",
      order: null,
    });
    expect(createChannelValue({ volume: 0.5 }).volume).toBe(0.5);
  });
});

describe("selectChannel", () => {
  it("tunes to the first track, from the start, keeping playing and volume", () => {
    const v = selectChannel({ ...createChannelValue(), playing: true, volume: 0.3, position: 42 }, LIST);
    expect(v).toMatchObject({ channelId: "list", trackId: "a", playing: true, volume: 0.3, position: 0, order: null });
  });

  it("has no track on a live channel", () => {
    expect(selectChannel(createChannelValue(), LIVE)).toMatchObject({ channelId: "live", trackId: null });
  });

  it("deals a fresh shuffle order when shuffle is on", () => {
    const v = selectChannel({ ...createChannelValue(), shuffle: true }, LIST, zero);
    expect(v.order).toHaveLength(3);
    expect([...v.order!].sort()).toEqual(["a", "b", "c"]);
    expect(v.trackId).toBe(v.order![0]);
  });

  it("clears the channel when given none", () => {
    expect(selectChannel(on(LIST), undefined)).toMatchObject({ channelId: null, trackId: null, order: null });
  });
});

describe("shuffleIds", () => {
  it("is a permutation, and puts `first` first", () => {
    const out = shuffleIds(["a", "b", "c", "d"], () => 0.5, "c");
    expect(out[0]).toBe("c");
    expect([...out].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("uses the random source (two sources, two orders)", () => {
    expect(shuffleIds(["a", "b", "c", "d"], () => 0)).not.toEqual(shuffleIds(["a", "b", "c", "d"], () => 0.999));
  });
});

describe("playOrder / currentTrack", () => {
  it("is the playlist order unless a valid shuffle order is held", () => {
    expect(playOrder(LIST, on(LIST))).toEqual(["a", "b", "c"]);
    expect(playOrder(LIST, on(LIST, { shuffle: true, order: ["c", "a", "b"] }))).toEqual(["c", "a", "b"]);
  });

  it("ignores a stale shuffle order that no longer covers the tracks", () => {
    expect(playOrder(LIST, on(LIST, { shuffle: true, order: ["c", "zz"] }))).toEqual(["c", "a", "b"]);
  });

  it("finds the current track", () => {
    expect(currentTrack(LIST, on(LIST, { trackId: "b" }))?.id).toBe("b");
    expect(currentTrack(LIVE, on(LIVE))).toBeUndefined();
  });
});

describe("toggleShuffle / cycleRepeat", () => {
  it("shuffling keeps the current track first; unshuffling drops the order", () => {
    const v = toggleShuffle(on(LIST, { trackId: "b" }), LIST, zero);
    expect(v.shuffle).toBe(true);
    expect(v.order![0]).toBe("b");
    expect(toggleShuffle(v, LIST)).toMatchObject({ shuffle: false, order: null, trackId: "b" });
  });

  it("cycles off, all, one, off", () => {
    let v = on(LIST);
    v = cycleRepeat(v);
    expect(v.repeat).toBe("all");
    v = cycleRepeat(v);
    expect(v.repeat).toBe("one");
    v = cycleRepeat(v);
    expect(v.repeat).toBe("off");
  });
});

describe("selectTrack / nextTrack / previousTrack", () => {
  it("selecting a track starts it from zero", () => {
    expect(selectTrack(on(LIST, { position: 30 }), "c")).toMatchObject({ trackId: "c", position: 0 });
  });

  it("next follows the play order, and stops at the end with repeat off", () => {
    expect(nextTrack(on(LIST, { trackId: "a" }), LIST).trackId).toBe("b");
    const end = on(LIST, { trackId: "c", playing: true });
    expect(nextTrack(end, LIST)).toBe(end);
  });

  it("next wraps with repeat all", () => {
    expect(nextTrack(on(LIST, { trackId: "c", repeat: "all" }), LIST).trackId).toBe("a");
  });

  it("next follows the shuffle order", () => {
    const v = on(LIST, { shuffle: true, order: ["c", "a", "b"], trackId: "c" });
    expect(nextTrack(v, LIST).trackId).toBe("a");
  });

  it("previous restarts a track that is more than 3 seconds in", () => {
    expect(previousTrack(on(LIST, { trackId: "b", position: 10 }), LIST)).toMatchObject({ trackId: "b", position: 0 });
  });

  it("previous goes back near the start, wraps with repeat all, and restarts the first otherwise", () => {
    expect(previousTrack(on(LIST, { trackId: "b", position: 1 }), LIST).trackId).toBe("a");
    expect(previousTrack(on(LIST, { trackId: "a", repeat: "all" }), LIST).trackId).toBe("c");
    expect(previousTrack(on(LIST, { trackId: "a", position: 2 }), LIST)).toMatchObject({ trackId: "a", position: 0 });
  });

  it("does nothing on a live channel", () => {
    const v = on(LIVE, { playing: true });
    expect(nextTrack(v, LIVE)).toBe(v);
    expect(previousTrack(v, LIVE)).toBe(v);
  });
});

describe("trackEnded", () => {
  it("advances, keeping playing", () => {
    expect(trackEnded(on(LIST, { trackId: "a", playing: true, position: 200 }), LIST)).toMatchObject({
      trackId: "b",
      playing: true,
      position: 0,
    });
  });

  it("stops after the last track with repeat off", () => {
    expect(trackEnded(on(LIST, { trackId: "c", playing: true, position: 200 }), LIST)).toMatchObject({
      trackId: "c",
      playing: false,
      position: 0,
    });
  });

  it("wraps with repeat all and replays with repeat one", () => {
    expect(trackEnded(on(LIST, { trackId: "c", playing: true, repeat: "all" }), LIST)).toMatchObject({ trackId: "a", playing: true });
    expect(trackEnded(on(LIST, { trackId: "b", playing: true, repeat: "one" }), LIST)).toMatchObject({ trackId: "b", playing: true, position: 0 });
  });

  it("a single-track channel stops, or loops with any repeat", () => {
    expect(trackEnded(on(SINGLE, { playing: true }), SINGLE)).toMatchObject({ trackId: "a", playing: false });
    expect(trackEnded(on(SINGLE, { playing: true, repeat: "all" }), SINGLE)).toMatchObject({ trackId: "a", playing: true, position: 0 });
  });
});

describe("upNext", () => {
  it("lists what follows in play order", () => {
    expect(upNext(LIST, on(LIST, { trackId: "a" })).map((x) => x.id)).toEqual(["b", "c"]);
    expect(upNext(LIST, on(LIST, { trackId: "c" })).map((x) => x.id)).toEqual([]);
  });

  it("wraps with repeat all, and is empty for live", () => {
    expect(upNext(LIST, on(LIST, { trackId: "b", repeat: "all" })).map((x) => x.id)).toEqual(["c", "a"]);
    expect(upNext(LIVE, on(LIVE))).toEqual([]);
  });
});

describe("playlist edits", () => {
  it("moves a track to an index, clamped", () => {
    expect(moveTrack([A, B, C], "c", 0).map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(moveTrack([A, B, C], "a", 99).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(moveTrack([A, B, C], "zz", 0).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("adds a track, refusing a duplicate id", () => {
    const D = t("d");
    expect(addTrack([A, B], D).map((x) => x.id)).toEqual(["a", "b", "d"]);
    expect(addTrack([A, B], D, 1).map((x) => x.id)).toEqual(["a", "d", "b"]);
    const same = [A, B];
    expect(addTrack(same, { ...A, title: "again" })).toBe(same);
  });

  it("removes a track", () => {
    expect(removeTrack([A, B, C], "b").map((x) => x.id)).toEqual(["a", "c"]);
  });

  it("applies a staged edit", () => {
    expect(applyQueueEdit([A, B, C], { id: "e1", op: "remove", trackId: "a" }).map((x) => x.id)).toEqual(["b", "c"]);
    expect(applyQueueEdit([A, B, C], { id: "e2", op: "clear" })).toEqual([]);
    expect(applyQueueEdit([A], { id: "e3", op: "replace", tracks: [B, C] }).map((x) => x.id)).toEqual(["b", "c"]);
  });
});

describe("reconcileValue", () => {
  it("keeps the current track when it survives an edit", () => {
    const next: Channel = { ...LIST, tracks: [C, B] } as Channel;
    expect(reconcileValue(on(LIST, { trackId: "b" }), next)).toMatchObject({ trackId: "b" });
  });

  it("moves to the track that took the removed one's place, or the first", () => {
    const next: Channel = { ...LIST, tracks: [A, C] } as Channel;
    expect(reconcileValue(on(LIST, { trackId: "b", position: 50 }), next, LIST)).toMatchObject({ trackId: "c", position: 0 });
    // Without the old channel there is no old position to go by: the first.
    expect(reconcileValue(on(LIST, { trackId: "b" }), next).trackId).toBe("a");
    const emptied: Channel = { ...LIST, tracks: [] } as Channel;
    expect(reconcileValue(on(LIST, { trackId: "b", playing: true }), emptied)).toMatchObject({ trackId: null, playing: false });
  });

  it("keeps a shuffle order in step with the tracks: drops the removed, appends the added", () => {
    const D = t("d");
    const next: Channel = { ...LIST, tracks: [A, C, D] } as Channel;
    const v = reconcileValue(on(LIST, { trackId: "a", shuffle: true, order: ["c", "b", "a"] }), next);
    expect(v.order).toEqual(["c", "a", "d"]);
  });

  it("leaves another channel's value alone", () => {
    const v = on(SINGLE);
    expect(reconcileValue(v, LIST)).toBe(v);
  });
});
