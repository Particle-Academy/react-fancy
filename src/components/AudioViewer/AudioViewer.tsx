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
            className={cn(
              "w-full",
              // Lab run 651, the K8 fix VideoViewer already has: Tab lands on
              // the play / timeline / volume controls inside the user-agent
              // shadow root, where `<audio>` matches `:focus-within` but not
              // `:focus-visible`, so the UA outline did not draw. An inset
              // outline on `:focus-within` covers every stop.
              "focus-within:outline-2 focus-within:outline-solid focus-within:-outline-offset-2 focus-within:outline-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-within:outline-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
            )}
          />
        )}
      </div>
    );
  },
);

AudioViewer.displayName = "AudioViewer";
