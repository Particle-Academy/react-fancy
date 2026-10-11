import type { SVGAttributes } from "react";

import type { QrErrorCorrection, QrMode } from "./qr-encode";

export type { QrErrorCorrection, QrMode };

/**
 * `viewBox` is omitted because the component computes it from the symbol's
 * module count — overriding it would rescale the modules and break the
 * crispness the vector output exists for.
 *
 * `version` is omitted because SVG has an attribute of that name and ours
 * means the QR symbol version, a number. SVG's is a no-op in SVG 2 and was
 * only ever a document-conformance hint, so nothing is lost by shadowing it,
 * where renaming our prop would cost the one word every QR reference uses.
 */
export interface QrCodeProps
  extends Omit<SVGAttributes<SVGSVGElement>, "children" | "viewBox" | "version"> {
  /**
   * What the code carries. Any string — a URL, a PIN, a token.
   *
   * An empty string renders a valid (empty) symbol rather than throwing, so a
   * controlled surface can render before its value arrives.
   */
  value: string;
  /** Rendered width and height in pixels. Default 192. */
  size?: number;
  /**
   * Error correction level. Default `"M"` — about 15% of the symbol can be
   * damaged and still read, which is the usual choice for a screen.
   *
   * Higher is not better by default: `"H"` survives ~30% damage and holds a
   * third less, so the same value needs a bigger symbol with smaller modules,
   * and on a phone screen that can read WORSE than `"M"` at the same pixel
   * size. Raise it for print, for a label that will be scuffed, or when a logo
   * covers part of the symbol.
   */
  errorCorrection?: QrErrorCorrection;
  /**
   * Accessible name. **Required**, and it must describe the DESTINATION rather
   * than the artefact: "Pair this device" tells a screen-reader user what the
   * code is for, where "QR code" tells them only that an image they cannot use
   * is present.
   *
   * It is not a substitute for the value being reachable another way. A QR code
   * is unusable by anyone who cannot point a second device at this screen, so
   * the value should also appear as text or a link nearby — the `aria-label`
   * cannot carry a URL a user is expected to type.
   */
  label: string;
  /**
   * Modules of quiet zone around the symbol. Default 4, which is the
   * standard's minimum.
   *
   * **Do not set this to 0 to save space.** The quiet zone is not padding; it
   * is how a scanner finds the symbol's edge. A code flush against
   * surrounding content is the single most common reason a QR code that looks
   * perfect will not scan.
   */
  quietZone?: number;
  /** Module colour. Default `currentColor`, so it inherits text colour. */
  foreground?: string;
  /**
   * Background colour. Default `"transparent"`.
   *
   * **A transparent background inherits whatever is behind it**, so on a dark
   * surface the symbol renders dark-on-dark and most scanners will not read
   * it. Set an explicit light background, or set `foreground` and background
   * together, when the surface is not light. Contrast is what gets scanned,
   * not the dark modules on their own.
   */
  background?: string;
  /**
   * Force a mode instead of picking the narrowest that fits. Rarely useful;
   * the default packs digits three to ten bits where byte mode spends 24.
   */
  mode?: QrMode;
  /**
   * Force a symbol version (1–40), fixing the module count regardless of how
   * little the value needs. Useful when several codes must render at the same
   * module scale. Throws if the value does not fit.
   */
  version?: number;
}
