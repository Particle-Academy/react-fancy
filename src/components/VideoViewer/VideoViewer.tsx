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
          <div className="flex flex-col items-center justify-center gap-1 p-4 text-center text-sm text-zinc-400">
            <span className="font-medium">Couldn&apos;t load video</span>
            <span className="max-w-full truncate text-xs opacity-70">{src}</span>
          </div>
        ) : (
          <video
            src={src}
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
              fit === "cover" ? "h-full w-full object-cover" : "object-contain",
            )}
          />
        )}
      </div>
    );
  },
);

VideoViewer.displayName = "VideoViewer";
