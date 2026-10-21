import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { FauxClient } from "../FauxClient";
import { PdfPages } from "./PdfPages";
import type { PdfViewerProps } from "./PdfViewer.types";

/**
 * A standalone PDF viewer — embeds the document via the browser's native PDF
 * plugin (`<object>`), falling back to an `<iframe>`, then to a download link.
 * Fills its container, so give it a height (a `min-h` floor is built in).
 * Renders for PDF sources inside `<MediaViewer>`.
 *
 * ```tsx
 * <PdfViewer src="/report.pdf" title="report.pdf" style={{ height: 600 }} />
 * ```
 *
 * With `pages` it shows page images the app rendered instead, and never
 * fetches or references the PDF; `policy` and `watermark` apply there.
 *
 * ```tsx
 * <PdfViewer
 *   pages={{ count: 12, url: (n, scale) => `/docs/7/pages/${n}.png?scale=${scale}` }}
 *   policy={{ download: false, print: false, copy: false, screenshot: "deter" }}
 *   watermark={{ text: "jane@example.com" }}
 * />
 * ```
 */
export const PdfViewer = forwardRef<HTMLDivElement, PdfViewerProps>(
  (
    {
      src,
      pages,
      page,
      defaultPage,
      onPageChange,
      zoom,
      defaultZoom,
      onZoomChange,
      policy,
      watermark,
      title = "PDF document",
      className,
      style,
      frame = false,
      frameProps,
    },
    ref,
  ) => {
    if (pages) {
      // `src` is deliberately not passed on: in this mode the PDF is never
      // referenced, so it cannot leak through an attribute or a fallback link.
      const pageViewer = (
        <PdfPages
          ref={ref}
          pages={pages}
          page={page}
          defaultPage={defaultPage}
          onPageChange={onPageChange}
          zoom={zoom}
          defaultZoom={defaultZoom}
          onZoomChange={onZoomChange}
          policy={policy}
          watermark={watermark}
          title={title}
          className={cn(frame && "rounded-none", className)}
          style={style}
        />
      );
      if (!frame) return pageViewer;
      // Zoom lives on the viewer's own toolbar, which knows the page size; the
      // frame adds full screen.
      return (
        <FauxClient variant="browser" url={title} controls={{ zoom: false }} fill {...frameProps}>
          {pageViewer}
        </FauxClient>
      );
    }

    const viewer = (
      <div
        ref={ref}
        data-react-fancy-pdf-viewer=""
        className={cn(
          "relative h-full min-h-[20rem] w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900",
          className,
        )}
        style={style}
      >
        <object data={src} type="application/pdf" className="h-full w-full">
          <iframe
            src={src}
            title={title}
            className="h-full w-full border-0"
          />
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
            <span>This browser can&apos;t display the PDF inline.</span>
            <a
              href={src}
              download
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Download PDF
            </a>
          </div>
        </object>
      </div>
    );

    if (!frame) return viewer;

    // Full screen from the frame; zoom stays on the browser's PDF toolbar. A
    // plugin fits the page to its box, so scaling the box only re-fits it, and
    // the `#zoom=` open parameter is relative to the page's real size, which a
    // frame cannot know -- its bar would jump by uneven steps.
    return (
      // The browser variant, because the plugin swallows the pointer: hover over
      // the PDF never reaches the frame, so controls over it could not be
      // revealed, and its top-right corner is the PDF toolbar's. In the address
      // bar they are reachable and collide with nothing.
      <FauxClient variant="browser" url={title} controls={{ zoom: false }} fill {...frameProps}>
        {viewer}
      </FauxClient>
    );
  },
);

PdfViewer.displayName = "PdfViewer";
