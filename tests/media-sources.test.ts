// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getEmbedProvider,
  registerEmbedProvider,
  registerMediaAdapter,
  resolveMediaAdapter,
  sourceMedia,
  streamProtocol,
} from "../src/utils/media-sources";
import type { ChannelSource } from "../src/utils/media-channel";

/**
 * "Any streaming service" (Channels, Unreleased): which sources play natively,
 * and the two registries hosts extend: element adapters (hls.js plugs in here,
 * by the host, never as a react-fancy dependency) and embed providers.
 */

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

const ctx = { hostname: "app.example.com", autoplay: false };

describe("streamProtocol / sourceMedia", () => {
  it("guesses the protocol from the URL when it is not declared", () => {
    expect(streamProtocol({ type: "stream", url: "https://cdn.example.com/live/index.m3u8?t=1" })).toBe("hls");
    expect(streamProtocol({ type: "stream", url: "https://cdn.example.com/live/manifest.mpd" })).toBe("dash");
    expect(streamProtocol({ type: "stream", url: "https://ice.example.com/jazz" })).toBe("icecast");
    expect(streamProtocol({ type: "stream", url: "https://ice.example.com/x.m3u8", protocol: "icecast" })).toBe("icecast");
  });

  it("says audio or video", () => {
    expect(sourceMedia({ type: "file", url: "/a.mp3" })).toBe("audio");
    expect(sourceMedia({ type: "file", url: "/a.mp4" })).toBe("video");
    expect(sourceMedia({ type: "file", url: "/blob", mime: "video/webm" })).toBe("video");
    expect(sourceMedia({ type: "file", url: "/a.mp4", media: "audio" })).toBe("audio");
    expect(sourceMedia({ type: "stream", url: "https://ice.example.com/jazz" })).toBe("audio");
    expect(sourceMedia({ type: "stream", url: "https://cdn.example.com/a.m3u8" })).toBe("video");
    expect(sourceMedia({ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" })).toBe("video");
  });
});

describe("resolveMediaAdapter (native)", () => {
  const audio = () => document.createElement("audio");

  it("plays files and Icecast streams on the element", () => {
    expect(resolveMediaAdapter({ type: "file", url: "/a.mp3" }, audio())?.id).toBe("native");
    expect(resolveMediaAdapter({ type: "stream", url: "https://ice.example.com/jazz" }, audio())?.id).toBe("native");
  });

  it("plays HLS only where the browser does (Safari)", () => {
    const el = document.createElement("video");
    const hls: ChannelSource = { type: "stream", url: "https://cdn.example.com/a.m3u8" };
    vi.spyOn(el, "canPlayType").mockReturnValue("");
    expect(resolveMediaAdapter(hls, el)).toBeNull();
    vi.spyOn(el, "canPlayType").mockImplementation((t) => (t === "application/vnd.apple.mpegurl" ? "maybe" : ""));
    expect(resolveMediaAdapter(hls, el)?.id).toBe("native-hls");
  });

  it("has nothing for DASH or embeds", () => {
    expect(resolveMediaAdapter({ type: "stream", url: "https://cdn.example.com/a.mpd" }, audio())).toBeNull();
    expect(resolveMediaAdapter({ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" }, audio())).toBeNull();
  });

  it("refuses a URL that is not http(s) or same-origin relative", () => {
    expect(resolveMediaAdapter({ type: "file", url: "javascript:alert(1)" }, audio())).toBeNull();
    expect(resolveMediaAdapter({ type: "stream", url: "//evil.example.com/s" }, audio())).toBeNull();
  });

  it("attaches by src and detaches by dropping it", () => {
    const el = audio();
    const load = vi.spyOn(el, "load").mockImplementation(() => {});
    vi.spyOn(el, "pause").mockImplementation(() => {});
    const detach = resolveMediaAdapter({ type: "file", url: "/a.mp3" }, el)!.attach(el, { type: "file", url: "/a.mp3" });
    expect(el.getAttribute("src")).toBe("/a.mp3");
    detach();
    expect(el.hasAttribute("src")).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("registerMediaAdapter", () => {
  it("a host adapter (hls.js) takes over, and unregisters cleanly", () => {
    const el = document.createElement("video");
    vi.spyOn(el, "canPlayType").mockReturnValue("");
    const attach = vi.fn(() => () => {});
    cleanups.push(
      registerMediaAdapter({
        id: "hls.js",
        canPlay: (s) => s.type === "stream" && streamProtocol(s) === "hls",
        attach,
      }),
    );
    const hls: ChannelSource = { type: "stream", url: "https://cdn.example.com/a.m3u8" };
    expect(resolveMediaAdapter(hls, el)?.id).toBe("hls.js");
    cleanups.pop()!();
    expect(resolveMediaAdapter(hls, el)).toBeNull();
  });

  it("is still refused a non-http URL, whatever the adapter says", () => {
    cleanups.push(registerMediaAdapter({ id: "greedy", canPlay: () => true, attach: () => () => {} }));
    expect(resolveMediaAdapter({ type: "file", url: "data:audio/mp3;base64,AAA" }, document.createElement("audio"))).toBeNull();
  });
});

describe("embed providers", () => {
  it("YouTube: privacy-enhanced host, a strict id, JS API on", () => {
    const yt = getEmbedProvider("youtube")!;
    expect(yt.embedUrl({ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" }, ctx)).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&playsinline=1",
    );
    expect(yt.embedUrl({ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ" }, { ...ctx, autoplay: true })).toContain("&autoplay=1");
    expect(yt.embedUrl({ type: "embed", provider: "youtube", id: "../../evil" }, ctx)).toBeNull();
    expect(yt.embedUrl({ type: "embed", provider: "youtube", id: "dQw4w9WgXcQ\"><script>" }, ctx)).toBeNull();
  });

  it("Vimeo: numeric ids only", () => {
    const vm = getEmbedProvider("vimeo")!;
    expect(vm.embedUrl({ type: "embed", provider: "vimeo", id: "76979871" }, ctx)).toBe("https://player.vimeo.com/video/76979871?autoplay=0");
    expect(vm.embedUrl({ type: "embed", provider: "vimeo", id: "7697abc" }, ctx)).toBeNull();
  });

  it("Twitch: a channel name and the page's own hostname as parent", () => {
    const tw = getEmbedProvider("twitch")!;
    expect(tw.embedUrl({ type: "embed", provider: "twitch", id: "some_channel" }, ctx)).toBe(
      "https://player.twitch.tv/?channel=some_channel&parent=app.example.com&autoplay=false",
    );
    expect(tw.embedUrl({ type: "embed", provider: "twitch", id: "a&parent=evil.example" }, ctx)).toBeNull();
    expect(tw.embedUrl({ type: "embed", provider: "twitch", id: "ok" }, { ...ctx, hostname: "" })).toBeNull();
  });

  it("YouTube and Vimeo are driven over postMessage to their own origin only", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const post = vi.spyOn(iframe.contentWindow!, "postMessage").mockImplementation(() => {});
    getEmbedProvider("youtube")!.command!(iframe, "pause");
    expect(post).toHaveBeenCalledWith(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "https://www.youtube-nocookie.com",
    );
    getEmbedProvider("vimeo")!.command!(iframe, "play");
    expect(post).toHaveBeenLastCalledWith(JSON.stringify({ method: "play" }), "https://player.vimeo.com");
    iframe.remove();
  });

  it("hosts add providers, and a later one replaces a built-in until removed", () => {
    const mine = { id: "youtube", title: "Mine", embedUrl: () => "https://video.example.com/e/1" };
    cleanups.push(registerEmbedProvider(mine));
    expect(getEmbedProvider("youtube")?.title).toBe("Mine");
    cleanups.pop()!();
    expect(getEmbedProvider("youtube")?.title).toBe("YouTube");
  });

  it("an https embed URL is required, whoever built it", () => {
    cleanups.push(registerEmbedProvider({ id: "bad", title: "Bad", embedUrl: () => "javascript:alert(1)" }));
    expect(getEmbedProvider("bad")!.embedUrl({ type: "embed", provider: "bad", id: "x" }, ctx)).toBeNull();
  });
});
