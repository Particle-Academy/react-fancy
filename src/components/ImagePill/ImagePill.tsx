import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Popover } from "../Popover";
import type { ImagePillProps, ImagePillThumbnailState } from "./ImagePill.types";

/*
 * The classes the composer's image pill has always had. ImagePill IS that pill
 * now (InlinePill draws it), so a change here is a change to every composer.
 */
const PILL_BASE =
  "inline-flex select-none items-center rounded-md px-2 py-0.5 text-xs leading-5 transition-colors";
/*
 * rose-800 on rose-100: rose-600 was 3.77:1 at the pill's 12px (axe
 * `color-contrast`, every-component brief K26). rose-300 on the dark tint
 * clears AA on the darkest surface under it.
 */
const IMAGE_PILL =
  "bg-rose-100 font-medium text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
/** Merged onto the Popover panel's own defaults: tighter padding for a preview. */
const PREVIEW_BASE = "max-w-xs whitespace-pre-wrap break-all p-2 text-xs";

const DEFAULT_LABELS = {
  loading: "Loading preview…",
  error: "Preview unavailable",
};

/**
 * The thumbnail, mounted only while the preview is open. A File's object URL is
 * made here and revoked on close, so a thread of a hundred sent images holds no
 * object URLs until one is looked at.
 *
 * If the image cannot be shown (a Content-Security-Policy without `blob:` in
 * `img-src` is the usual reason) the label is shown instead. A broken `<img>`
 * with an empty `alt` renders as nothing at all, which is how a preview ends up
 * as an empty box.
 */
function Thumb({
  src,
  file,
  label,
  failed,
  onFailed,
}: {
  src?: string;
  file?: Blob | null;
  label: string;
  failed: boolean;
  onFailed: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (src || !file || typeof URL.createObjectURL !== "function") return;
    const made = URL.createObjectURL(file);
    setObjectUrl(made);
    return () => {
      URL.revokeObjectURL(made);
      setObjectUrl(null);
    };
  }, [src, file]);

  const url = src ?? objectUrl;
  return url && !failed ? (
    <img src={url} alt={label} onError={onFailed} className="block max-h-40 max-w-[16rem] rounded" />
  ) : (
    <span>{label}</span>
  );
}

/**
 * ImagePill: an image attachment as a compact pill, with its thumbnail in a hover
 * popover. The pill the composer (PromptInput, Composer) draws for a pasted
 * image, exported so a thread can show the same pill on a sent message.
 *
 * - The preview opens on hover AND on keyboard focus; blur and Escape close it.
 *   `open` / `onOpenChange` control it.
 * - The thumbnail comes from `src`, a `file`, or `loadThumbnail()`, which is
 *   called once, on the first hover or focus, with loading and error states.
 * - Handles: `data-react-fancy-image-pill` with `data-state="open|closed"` and
 *   `data-thumbnail` (see `ImagePillThumbnailState`) on the pill;
 *   `data-react-fancy-image-pill-preview` on the preview content. Any `data-*`
 *   you pass lands on the pill.
 */
export const ImagePill = forwardRef<HTMLSpanElement, ImagePillProps>(function ImagePill(
  {
    label,
    src,
    file,
    loadThumbnail,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    placement = "top",
    preview,
    previewClassName,
    previewProps,
    labels: labelsProp,
    className,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [open, setOpenState] = useControllableState(controlledOpen, defaultOpen, onOpenChange);

  const [loaded, setLoaded] = useState<{ status: "idle" | "loading" | "ready" | "error"; url?: string }>({
    status: "idle",
  });
  const [imgFailed, setImgFailed] = useState(false);
  const requested = useRef(false);
  const loaderRef = useRef(loadThumbnail);
  loaderRef.current = loadThumbnail;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Ask for the thumbnail, once for the life of the pill. */
  const ensureLoad = useCallback(() => {
    const load = loaderRef.current;
    if (!load || requested.current) return;
    requested.current = true;
    setLoaded({ status: "loading" });
    let pending: Promise<string>;
    try {
      pending = Promise.resolve(load());
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.then(
      (url) => {
        if (!alive.current) return;
        setLoaded(typeof url === "string" && url ? { status: "ready", url } : { status: "error" });
      },
      () => {
        if (alive.current) setLoaded({ status: "error" });
      },
    );
  }, []);

  /** Every request to open, from hover or focus, also asks for the thumbnail. */
  const setOpen = useCallback(
    (next: boolean) => {
      if (next) ensureLoad();
      setOpenState(next);
    },
    [ensureLoad, setOpenState],
  );

  // A host that opens it through `open` gets the thumbnail too.
  useEffect(() => {
    if (open) ensureLoad();
  }, [open, ensureLoad]);

  // A new image source is a new chance to load.
  useEffect(() => setImgFailed(false), [src, file, loaded.url]);

  const usesLoader = !src && loadThumbnail !== undefined;
  const thumbUrl = src ?? (usesLoader ? loaded.url : undefined);
  const thumbnail: ImagePillThumbnailState =
    imgFailed
      ? "error"
      : src
        ? "ready"
        : usesLoader
          ? loaded.status
          : file
            ? "ready"
            : "none";

  let content;
  if (preview !== undefined) {
    content = preview;
  } else if (usesLoader && loaded.status === "loading") {
    content = <span data-react-fancy-image-pill-loading="">{labels.loading}</span>;
  } else if (usesLoader && loaded.status === "error") {
    content = <span data-react-fancy-image-pill-error="">{labels.error}</span>;
  } else {
    content = (
      <Thumb
        src={thumbUrl}
        file={usesLoader ? undefined : file}
        label={label}
        failed={imgFailed}
        onFailed={() => setImgFailed(true)}
      />
    );
  }

  return (
    <Popover hover open={open} onOpenChange={setOpen} placement={placement}>
      <Popover.Trigger>
        <span
          {...rest}
          ref={ref}
          data-react-fancy-image-pill=""
          data-state={open ? "open" : "closed"}
          data-thumbnail={thumbnail}
          role="img"
          tabIndex={0}
          aria-label={label}
          onFocus={(e) => {
            onFocus?.(e);
            setOpen(true);
          }}
          onBlur={(e) => {
            onBlur?.(e);
            setOpen(false);
          }}
          className={cn(PILL_BASE, IMAGE_PILL, className)}
        >
          {label}
        </span>
      </Popover.Trigger>
      <Popover.Content className={cn(PREVIEW_BASE, previewClassName)}>
        <span
          {...previewProps}
          data-react-fancy-image-pill-preview=""
          aria-busy={thumbnail === "loading" || undefined}
        >
          {content}
        </span>
      </Popover.Content>
    </Popover>
  );
});

ImagePill.displayName = "ImagePill";
