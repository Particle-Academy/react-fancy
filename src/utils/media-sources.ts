import { isPlayableSrc } from "../components/StreamingAudio/station-src";
import { resolveMediaType } from "./media-type";
import type { EmbedSource, ChannelSource } from "./media-channel";

/**
 * "Any streaming service": how a {@link ChannelSource} reaches the screen.
 *
 * Two registries, both extended by the HOST:
 *
 * - **Element adapters** put a source on an `<audio>` / `<video>` element. The
 *   built-in one is native only: files, Icecast / Shoutcast mounts, and HLS
 *   where the browser plays it itself (Safari, iOS). HLS or DASH elsewhere
 *   needs a library such as hls.js, which react-fancy does not depend on: a
 *   host that wants it registers an adapter around it (see docs/Channels.md).
 * - **Embed providers** turn `{ provider, id }` into a provider's own iframe
 *   player. YouTube, Vimeo and Twitch are built in; hosts add others.
 *
 * Whatever an adapter or a provider says, a URL that is not `http(s)` (or, for
 * an element, same-origin relative) is never used.
 */

export interface MediaElementAdapter {
  id: string;
  /** Whether this adapter can play `source` on `el`. */
  canPlay(source: ChannelSource, el: HTMLMediaElement): boolean;
  /** Put `source` on `el`. Returns the detach, which must stop all network activity. */
  attach(el: HTMLMediaElement, source: ChannelSource): () => void;
}

const HLS_MIME = "application/vnd.apple.mpegurl";

function urlOf(source: ChannelSource): string | null {
  return source.type === "embed" ? null : source.url;
}

/** The stream protocol: declared, else guessed from the URL's extension. */
export function streamProtocol(source: ChannelSource): "icecast" | "hls" | "dash" {
  if (source.type === "stream" && source.protocol) return source.protocol;
  const url = urlOf(source) ?? "";
  const path = (url.split(/[?#]/, 1)[0] ?? "").toLowerCase();
  if (path.endsWith(".m3u8")) return "hls";
  if (path.endsWith(".mpd")) return "dash";
  return "icecast";
}

/** Whether a source shows picture (`<video>`) or not (`<audio>`). */
export function sourceMedia(source: ChannelSource): "audio" | "video" {
  if (source.type === "embed") return "video";
  if (source.media) return source.media;
  if (source.type === "file") {
    return resolveMediaType({ mime: source.mime, src: source.url }) === "video" ? "video" : "audio";
  }
  return streamProtocol(source) === "icecast" ? "audio" : "video";
}

function attachBySrc(el: HTMLMediaElement, url: string): () => void {
  el.setAttribute("src", url);
  el.load();
  return () => {
    try {
      el.pause();
    } catch {
      // jsdom and some engines throw on pause() of an unloaded element.
    }
    el.removeAttribute("src");
    el.load();
  };
}

const nativeAdapter: MediaElementAdapter = {
  id: "native",
  canPlay: (s) => s.type === "file" || (s.type === "stream" && streamProtocol(s) === "icecast"),
  attach: (el, s) => attachBySrc(el, urlOf(s) ?? ""),
};

const nativeHlsAdapter: MediaElementAdapter = {
  id: "native-hls",
  canPlay: (s, el) => s.type === "stream" && streamProtocol(s) === "hls" && canPlayNatively(el, HLS_MIME),
  attach: (el, s) => attachBySrc(el, urlOf(s) ?? ""),
};

function canPlayNatively(el: HTMLMediaElement, mime: string): boolean {
  try {
    return typeof el.canPlayType === "function" && el.canPlayType(mime) !== "";
  } catch {
    return false;
  }
}

const BUILT_IN_ADAPTERS = [nativeAdapter, nativeHlsAdapter];
let hostAdapters: MediaElementAdapter[] = [];

/** Add an element adapter. Later registrations are asked first. Returns the unregister. */
export function registerMediaAdapter(adapter: MediaElementAdapter): () => void {
  hostAdapters = [adapter, ...hostAdapters];
  return () => {
    hostAdapters = hostAdapters.filter((a) => a !== adapter);
  };
}

/** The adapter that will play `source` on `el`, or `null` when none can (or the URL is refused). */
export function resolveMediaAdapter(source: ChannelSource, el: HTMLMediaElement): MediaElementAdapter | null {
  const url = urlOf(source);
  if (url == null || !isPlayableSrc(url)) return null;
  for (const adapter of [...hostAdapters, ...BUILT_IN_ADAPTERS]) {
    try {
      if (adapter.canPlay(source, el)) return adapter;
    } catch {
      // A host adapter that throws in canPlay is skipped, not fatal.
    }
  }
  return null;
}

// -- embeds -----------------------------------------------------------------

export interface EmbedContext {
  /** The page's hostname (Twitch requires it as `parent`). Empty during a server render. */
  hostname: string;
  autoplay: boolean;
}

export interface EmbedProvider {
  id: string;
  /** Shown on the poster and used as the iframe title. */
  title: string;
  /** The iframe URL, or `null` when the source is not one this provider accepts. Must be `https:`. */
  embedUrl(source: EmbedSource, ctx: EmbedContext): string | null;
  /** The iframe `allow` attribute. */
  allow?: string;
  /** Play / pause the loaded player, where the provider has an API for it. */
  command?(iframe: HTMLIFrameElement, cmd: "play" | "pause"): void;
}

const DEFAULT_ALLOW = "autoplay; encrypted-media; picture-in-picture; fullscreen";

function post(iframe: HTMLIFrameElement, message: unknown, origin: string) {
  try {
    iframe.contentWindow?.postMessage(JSON.stringify(message), origin);
  } catch {
    // A detached frame has no window to post to.
  }
}

const youtube: EmbedProvider = {
  id: "youtube",
  title: "YouTube",
  embedUrl: (s, ctx) => {
    if (!/^[A-Za-z0-9_-]{11}$/.test(s.id)) return null;
    return `https://www.youtube-nocookie.com/embed/${s.id}?enablejsapi=1&playsinline=1${ctx.autoplay ? "&autoplay=1" : ""}`;
  },
  allow: DEFAULT_ALLOW,
  command: (iframe, cmd) =>
    post(iframe, { event: "command", func: cmd === "play" ? "playVideo" : "pauseVideo", args: [] }, "https://www.youtube-nocookie.com"),
};

const vimeo: EmbedProvider = {
  id: "vimeo",
  title: "Vimeo",
  embedUrl: (s, ctx) => (/^\d{1,12}$/.test(s.id) ? `https://player.vimeo.com/video/${s.id}?autoplay=${ctx.autoplay ? 1 : 0}` : null),
  allow: DEFAULT_ALLOW,
  command: (iframe, cmd) => post(iframe, { method: cmd }, "https://player.vimeo.com"),
};

/** Twitch's embed has no postMessage control without Twitch's own script, so it is not driven. */
const twitch: EmbedProvider = {
  id: "twitch",
  title: "Twitch",
  embedUrl: (s, ctx) => {
    if (!/^[A-Za-z0-9_]{1,25}$/.test(s.id)) return null;
    if (!/^[A-Za-z0-9.-]+$/.test(ctx.hostname)) return null;
    return `https://player.twitch.tv/?channel=${s.id}&parent=${ctx.hostname}&autoplay=${ctx.autoplay ? "true" : "false"}`;
  },
  allow: DEFAULT_ALLOW,
};

const BUILT_IN_PROVIDERS: Record<string, EmbedProvider> = { youtube, vimeo, twitch };
let hostProviders: EmbedProvider[] = [];

/** Add an embed provider. One with a built-in's id replaces it until removed. Returns the unregister. */
export function registerEmbedProvider(provider: EmbedProvider): () => void {
  hostProviders = [provider, ...hostProviders];
  return () => {
    hostProviders = hostProviders.filter((p) => p !== provider);
  };
}

function httpsOnly(url: string | null): string | null {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).protocol === "https:" && !/[\u0000-\u001F\u007F\\]/.test(url) ? url : null;
  } catch {
    return null;
  }
}

/** The provider for an id, with its URL held to `https:`. */
export function getEmbedProvider(id: string): EmbedProvider | undefined {
  const provider = hostProviders.find((p) => p.id === id) ?? BUILT_IN_PROVIDERS[id];
  if (!provider) return undefined;
  return { ...provider, embedUrl: (s, ctx) => httpsOnly(provider.embedUrl(s, ctx)) };
}
