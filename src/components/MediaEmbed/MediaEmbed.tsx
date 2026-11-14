import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { getEmbedProvider } from "../../utils/media-sources";
import { Icon } from "../Icon/Icon";
import { FOCUS_RING, SURFACE, TEXT, TEXT_MUTED } from "../ChannelPlayer/media-classes";
import type { MediaEmbedLabels, MediaEmbedProps } from "./MediaEmbed.types";

const DEFAULT_LABELS: MediaEmbedLabels = {
  play: "Play {title} on {provider}",
  unsupported: "This video can't be embedded.",
};

/** The iframe may run the provider's player and nothing more: no top navigation, no forms. */
const SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-popups";

/**
 * A provider's own player (YouTube, Vimeo, Twitch, or one a host registers
 * with `registerEmbedProvider`). Until it is first played it is a poster with a
 * play button, so a page that shows an embed makes no request to the provider
 * on load.
 */
export const MediaEmbed = forwardRef<HTMLDivElement, MediaEmbedProps>(function MediaEmbed(
  { source, playing, onPlayingChange, title, poster, onError, labels: labelsProp, className, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const provider = getEmbedProvider(source.provider);
  const name = title ?? provider?.title ?? source.provider;
  const key = `${source.provider}:${source.id}`;

  const iframe = useRef<HTMLIFrameElement | null>(null);
  /** The URL the player was loaded with; fixed once loaded, so pausing never reloads the frame. */
  const [loadedUrl, setLoadedUrl] = useState<{ key: string; url: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const latest = useRef({ onError, source, provider });
  latest.current = { onError, source, provider };

  // Validate (with the real hostname: Twitch needs it) and load on first play.
  useEffect(() => {
    const { source: s, provider: p } = latest.current;
    const hostname = typeof window === "undefined" ? "" : window.location.hostname;
    const probe = p?.embedUrl(s, { hostname, autoplay: false }) ?? null;
    if (!probe) {
      setLoadedUrl(null);
      if (failed !== key) {
        setFailed(key);
        latest.current.onError?.();
      }
      return;
    }
    setFailed(null);
    if (playing && (loadedUrl === null || loadedUrl.key !== key)) {
      const url = p!.embedUrl(s, { hostname, autoplay: true });
      if (url) setLoadedUrl({ key, url });
    }
  }, [key, playing]);

  // Drive the loaded player.
  const commanded = useRef<boolean | null>(null);
  useEffect(() => {
    const frame = iframe.current;
    if (!loadedUrl || !frame) {
      commanded.current = null;
      return;
    }
    if (commanded.current === null) {
      // Just loaded, autoplaying: nothing to send.
      commanded.current = playing;
      return;
    }
    if (commanded.current !== playing) {
      commanded.current = playing;
      latest.current.provider?.command?.(frame, playing ? "play" : "pause");
    }
  }, [playing, loadedUrl]);

  const isFailed = failed === key;
  const loaded = loadedUrl !== null && loadedUrl.key === key && !isFailed;

  return (
    <div
      ref={ref}
      data-react-fancy-media-embed=""
      data-embed-provider={source.provider}
      data-embed-loaded={loaded ? "true" : "false"}
      className={cn("relative aspect-video w-full overflow-hidden rounded-lg border", SURFACE, className)}
      {...rest}
    >
      {isFailed ? (
        <p data-embed-error="" className={cn("flex h-full items-center justify-center p-4 text-sm", TEXT_MUTED)}>
          {labels.unsupported}
        </p>
      ) : loaded ? (
        <iframe
          ref={iframe}
          src={loadedUrl.url}
          title={name}
          allow={provider?.allow}
          sandbox={SANDBOX}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          data-embed-poster=""
          aria-label={fillLabel(labels.play, { title: name, provider: provider?.title ?? source.provider })}
          onClick={() => onPlayingChange?.(true)}
          className={cn("absolute inset-0 flex h-full w-full items-center justify-center", FOCUS_RING)}
        >
          {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <span className={cn("relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium", SURFACE, TEXT)}>
            <Icon name="play" size="sm" />
            {name}
          </span>
        </button>
      )}
    </div>
  );
});

MediaEmbed.displayName = "MediaEmbed";
