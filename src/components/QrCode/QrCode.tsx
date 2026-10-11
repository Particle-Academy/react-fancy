import { forwardRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { encodeQr } from "./qr-encode";
import type { QrCodeProps } from "./QrCode.types";

/**
 * A QR code, as an SVG, with no dependencies.
 *
 * ## Why SVG and one path
 *
 * The symbol is drawn as a **single `<path>`** of one-unit squares on a
 * `viewBox` sized in modules, not as a grid of `<rect>` elements. A version 10
 * symbol is 57x57 — over three thousand modules — and a rect each would be
 * three thousand DOM nodes for something that never changes. One path is one
 * node, and because the viewBox is in module units the symbol is resolution
 * independent: `size` scales it with no resampling, so it stays crisp at any
 * size and prints at the printer's resolution rather than the screen's.
 *
 * This matters more than it sounds for scanning. A raster QR code scaled to a
 * non-integer multiple of its module size gets blurred module edges, and a
 * scanner reading a blurred edge guesses. Vector output cannot have that
 * problem.
 *
 * ## `value` is any string — this is not a link component
 *
 * A QR code is a byte container, and most of what belongs in one is not a web
 * address: a serial or asset number, a lot code, a ticket id, a WiFi
 * credential block, a contact card, a `tel:` or `geo:` URI, plain text. Those
 * are the cases where the format earns its place, because they need no network
 * at all — the scanner reads the value and that IS the payload.
 *
 * ## It is an image of a value, not the value
 *
 * A QR code is unreadable to anyone without a second device pointed at the
 * screen — which includes every screen-reader user and anyone whose phone is
 * the device showing it. So `label` is required, and the value should ALSO be
 * selectable text beside it. A panel that shows only a code is one some people
 * cannot use at all.
 *
 * @example
 * ```tsx
 * // Any string. A digits-only value is numeric mode and a third the size.
 * <QrCode value="SN-4829-13" size={192} label="Asset tag for pump 14" />
 * <QrCode value="482913" size={192} label="Order reference" />
 *
 * // A payload with no network in it at all.
 * <QrCode value="WIFI:T:WPA;S:Guest;P:hunter2;;" label="Join the guest WiFi" />
 *
 * // A link is one payload among many, not the default case.
 * <QrCode value="https://example.com/menu" label="Today's menu" />
 *
 * // On a dark surface, set both colours: a transparent background renders
 * // dark-on-dark and will not scan.
 * <QrCode value={serial} label="Asset tag" foreground="#0b0b0c" background="#ffffff" />
 * ```
 */
export const QrCode = forwardRef<SVGSVGElement, QrCodeProps>(
  (
    {
      value,
      size = 192,
      errorCorrection = "M",
      label,
      quietZone = 4,
      foreground = "currentColor",
      background = "transparent",
      mode,
      version,
      className,
      ...props
    },
    ref,
  ) => {
    // Encoding a version 40 symbol is real work (Reed-Solomon over 2,956
    // codewords, then eight masks scored). Nothing about it depends on `size`
    // or the colours, so it is memoised on the inputs that actually change it
    // — otherwise a parent re-render on hover re-encodes the whole symbol.
    const symbol = useMemo(
      () => encodeQr(value, { errorCorrection, mode, version }),
      [value, errorCorrection, mode, version],
    );

    const extent = symbol.size + quietZone * 2;

    const path = useMemo(() => {
      const parts: string[] = [];
      for (let row = 0; row < symbol.size; row += 1) {
        const line = symbol.modules[row] as boolean[];
        let col = 0;
        while (col < symbol.size) {
          if (!line[col]) {
            col += 1;
            continue;
          }
          // Run-length the dark modules along the row: a horizontal run
          // becomes one rectangle rather than one per module, which roughly
          // halves the path for a typical symbol and costs nothing to read.
          let run = 1;
          while (col + run < symbol.size && line[col + run]) {
            run += 1;
          }
          parts.push(`M${col + quietZone} ${row + quietZone}h${run}v1h-${run}z`);
          col += run;
        }
      }
      return parts.join("");
    }, [symbol, quietZone]);

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${extent} ${extent}`}
        role="img"
        aria-label={label}
        // Nearest-neighbour rather than smoothing, for the rasterisers that
        // apply it anyway: a blurred module edge is a module a scanner has to
        // guess at.
        shapeRendering="crispEdges"
        className={cn("fa-qr-code", className)}
        {...props}
      >
        {background !== "transparent" && (
          <rect width={extent} height={extent} fill={background} />
        )}
        <path d={path} fill={foreground} />
      </svg>
    );
  },
);

QrCode.displayName = "QrCode";
