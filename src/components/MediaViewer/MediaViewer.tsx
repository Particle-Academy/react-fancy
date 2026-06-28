import { forwardRef } from "react";
import { resolveMediaType } from "../../utils/media-type";
import { ImageViewer } from "../ImageViewer";
import { VideoViewer } from "../VideoViewer";
import { AudioViewer } from "../AudioViewer";
import { PdfViewer } from "../PdfViewer";
import { MediaFallback } from "./MediaFallback";
import type { MediaViewerProps } from "./MediaViewer.types";

/**
 * Renders the right viewer for a media file, picked from its `mime` (preferred)
 * or `src` — image, video, audio, or PDF — and a download fallback for anything
 * else. SVG renders through `<ImageViewer>`. The single entry point for showing
 * a file from a tree/workspace when you don't know its type ahead of time.
 *
 * ```tsx
 * <MediaViewer src={url} mime="image/png" alt="logo.png" style={{ height: 320 }} />
 * ```
 */
export const MediaViewer = forwardRef<HTMLDivElement, MediaViewerProps>(
  (
    {
      src,
      mime,
      alt,
      kind,
      imageProps,
      videoProps,
      audioProps,
      pdfProps,
      fallback,
      onError,
      className,
      style,
    },
    ref,
  ) => {
    const resolved = kind ?? resolveMediaType({ mime, src });

    switch (resolved) {
      case "image":
        return (
          <ImageViewer
            ref={ref}
            src={src}
            alt={alt ?? ""}
            onError={onError}
            className={className}
            style={style}
            {...imageProps}
          />
        );
      case "video":
        return (
          <VideoViewer
            ref={ref}
            src={src}
            onError={onError}
            className={className}
            style={style}
            {...videoProps}
          />
        );
      case "audio":
        return (
          <AudioViewer
            ref={ref}
            src={src}
            title={alt}
            onError={onError}
            className={className}
            style={style}
            {...audioProps}
          />
        );
      case "pdf":
        return (
          <PdfViewer
            ref={ref}
            src={src}
            title={alt}
            className={className}
            style={style}
            {...pdfProps}
          />
        );
      default:
        return (
          <div
            ref={ref}
            data-react-fancy-media-viewer=""
            className={className}
            style={style}
          >
            {fallback ?? <MediaFallback src={src} mime={mime} label={alt} />}
          </div>
        );
    }
  },
);

MediaViewer.displayName = "MediaViewer";
