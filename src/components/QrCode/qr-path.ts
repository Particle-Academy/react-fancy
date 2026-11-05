/**
 * The SVG path for a symbol's dark modules, on a module-unit grid offset by the
 * quiet zone.
 *
 * ONE function draws every copy of a code: `<QrCode>` on screen, the SVG file
 * `qrCodeSvg` writes, and the PNG `qrCodePng` rasterises (the same string,
 * handed to `Path2D`). A file that differs from the code on screen is the
 * failure this exists to rule out, and three path builders would be three
 * chances for it.
 *
 * Horizontal runs of dark modules become one rectangle each rather than one
 * per module, which roughly halves the path for a typical symbol.
 */
export function modulePath(modules: readonly (readonly boolean[])[], quietZone: number): string {
  const size = modules.length;
  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    const line = modules[row] as readonly boolean[];
    let col = 0;
    while (col < size) {
      if (!line[col]) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < size && line[col + run]) {
        run += 1;
      }
      parts.push(`M${col + quietZone} ${row + quietZone}h${run}v1h-${run}z`);
      col += run;
    }
  }
  return parts.join("");
}
