import { forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { AudioViewerProps } from "./AudioViewer.types";

/**
 * A standalone audio viewer — a themed card wrapping the native audio player,
 * with an optional title. Renders for audio sources inside `<MediaViewer>`.
 *
 * ```tsx
 * <AudioViewer src="/track.mp3" title="track.mp3" />
 * ```
 */
export const AudioViewer = forwardRef<HTMLDivElement, AudioViewerProps>(
  (
    {
      src,
      title,
      controls = true,
      autoPlay = false,
      loop = false,
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
        data-react-fancy-audio-viewer=""
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900",
          className,
        )}
        style={style}
      >
        {title && (
          <div className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {title}
          </div>
        )}
        {errored ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Couldn&apos;t load audio.
          </div>
        ) : (
          <audio
            src={src}
            controls={controls}
            autoPlay={autoPlay}
            loop={loop}
            onError={() => {
              setErrored(true);
              onError?.();
            }}
            className="w-full"
          />
        )}
      </div>
    );
  },
);

AudioViewer.displayName = "AudioViewer";
