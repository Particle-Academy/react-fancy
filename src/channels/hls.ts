import Hls from "hls.js";
import type { HlsConfig } from "hls.js";
import { registerMediaAdapter, streamProtocol } from "../utils/media-sources";
import type { MediaElementAdapter } from "../utils/media-sources";
import type { ChannelSource } from "../utils/media-channel";

/**
 * HLS for ChannelPlayer in browsers without native HLS (Chrome, Firefox, Edge
 * desktop, Android), through hls.js.
 *
 * OPT-IN: `import "@particle-academy/react-fancy/channels/hls"` registers it.
 * hls.js is an optional peer, so install it yourself (`npm install hls.js`).
 * Nothing else in react-fancy imports this file or hls.js, so an app that
 * never imports this subpath never loads hls.js. Owner approval: q_8d88f092,
 * 2026-11-14.
 *
 * Errors: hls.js recovers from non-fatal errors itself. A fatal media error
 * gets one `recoverMediaError()`; any other fatal error (or a second media
 * one) destroys the instance and fires the element's `error` event, which is
 * what ChannelPlayer's reconnect-with-backoff listens for. A reconnect
 * attaches a fresh instance.
 */

export interface HlsAdapterOptions {
  /** Passed to `new Hls(config)`. */
  config?: Partial<HlsConfig>;
}

function urlOf(source: ChannelSource): string {
  return source.type === "embed" ? "" : source.url;
}

/** An adapter around hls.js. Register it with `registerMediaAdapter`, or use `registerHlsAdapter`. */
export function createHlsAdapter(options: HlsAdapterOptions = {}): MediaElementAdapter {
  return {
    id: "hls.js",
    canPlay: (source) => source.type === "stream" && streamProtocol(source) === "hls" && Hls.isSupported(),
    attach(el, source) {
      const hls = new Hls(options.config);
      let destroyed = false;
      let mediaRecoveries = 0;
      const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        hls.destroy();
        // hls.js detaches its blob: src; drop anything left so the network stops.
        if (el.hasAttribute("src")) {
          el.removeAttribute("src");
          el.load();
        }
      };
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || destroyed) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries === 0) {
          mediaRecoveries++;
          hls.recoverMediaError();
          return;
        }
        destroy();
        el.dispatchEvent(new Event("error"));
      });
      hls.loadSource(urlOf(source));
      hls.attachMedia(el);
      return destroy;
    },
  };
}

/** The adapter this subpath registers on import. */
export const hlsAdapter: MediaElementAdapter = createHlsAdapter();

let unregister: (() => void) | null = null;

/** Register `hlsAdapter` (it is, on import). Registering again returns the same unregister. */
export function registerHlsAdapter(): () => void {
  if (unregister) return unregister;
  const off = registerMediaAdapter(hlsAdapter);
  const once = () => {
    off();
    if (unregister === once) unregister = null;
  };
  unregister = once;
  return once;
}

/** Remove the adapter; HLS falls back to native-only. */
export function unregisterHlsAdapter(): void {
  unregister?.();
}

registerHlsAdapter();
