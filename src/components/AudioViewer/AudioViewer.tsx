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
      preload = "metadata",
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
          "flex flex-col gap-2 rounded-lg border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-4 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
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
          <div className="text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
            Couldn&apos;t load audio.
          </div>
        ) : (
          <audio
            src={src}
            preload={preload}
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
