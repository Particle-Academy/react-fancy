import { forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { VideoViewerProps } from "./VideoViewer.types";

/**
 * A standalone video viewer — native controls, optional poster, fit-to-box, and
 * dark-aware framing. Renders for video sources inside `<MediaViewer>`.
 *
 * ```tsx
 * <VideoViewer src="/clip.mp4" poster="/clip.jpg" style={{ height: 360 }} />
 * ```
 */
export const VideoViewer = forwardRef<HTMLDivElement, VideoViewerProps>(
  (
    {
      src,
      poster,
      controls = true,
      autoPlay = false,
      loop = false,
      preload = "metadata",
      muted = false,
      fit = "contain",
      onError,
      className,
      style,
    },
    ref,
  ) => {
    const [errored, setErrored] = useState(false);

    return (
      <div
        ref={ref}
        data-react-fancy-video-viewer=""
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-md bg-black",
          className,
        )}
        style={style}
      >
        {errored ? (
          <div className="flex flex-col items-center justify-center gap-1 p-4 text-center text-sm text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
            <span className="font-medium">Couldn&apos;t load video</span>
            <span className="max-w-full truncate text-xs opacity-70">{src}</span>
          </div>
        ) : (
          <video
            src={src}
            preload={preload}
            poster={poster}
            controls={controls}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline
            onError={() => {
              setErrored(true);
              onError?.();
            }}
            className={cn(
              "max-h-full max-w-full",
              // K8: `<video controls>` is a Tab stop itself and its play /
              // timeline / volume controls are more, inside its user-agent
              // shadow root. While one of those has focus the video matches
              // `:focus-within` but not `:focus`, so the UA outline went away;
              // and that outline is drawn OUTSIDE the element, where the
              // wrapper's `overflow-hidden` clipped it anyway. An inset outline
              // on `:focus-within` covers every stop and cannot be clipped.
              "focus-within:outline-2 focus-within:outline-solid focus-within:-outline-offset-2 focus-within:outline-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-within:outline-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
              fit === "cover" ? "h-full w-full object-cover" : "object-contain",
            )}
          />
        )}
      </div>
    );
  },
);

VideoViewer.displayName = "VideoViewer";
