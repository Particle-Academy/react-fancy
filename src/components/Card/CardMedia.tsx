import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { CardMediaProps } from "./Card.types";

/**
 * The fixed-ratio media region at the top of a card: a thumbnail, gradient or
 * solid swatch, with slots pinned to its corners.
 *
 * This is `Card.Media` rather than a separate `<MediaCard>` because the thing
 * being asked for was never a different card — it was a card with a picture in
 * it. Four surfaces had each rebuilt exactly this (a gallery index, a package
 * grid, a starter-kit grid and a showcase grid) and one of them was already
 * wrapping `Card` and hand-rolling only this region.
 *
 * ## The `background` is not decoration
 *
 * It shows through while the image loads and stays visible if the image never
 * arrives. The gallery relied on that: each style card is keyed to a swatch, so
 * a missing screenshot degrades to the right colour rather than to a hole.
 */
export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(
  (
    {
      src,
      alt = "",
      ratio = "16/9",
      height,
      background,
      objectPosition = "center",
      loading = "lazy",
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-react-fancy-card-media=""
        className={cn(
          "relative overflow-hidden rounded-t-lg",
          // Card's `padding` prop pads EVERY direct div child
          // (`[&>div]:px-4 …`), which would inset the media and break the
          // flush-to-the-edge look every caller wants. `!` wins regardless of
          // stylesheet order, which plain `p-0` would not.
          "!px-0 !py-0",
          className,
        )}
        style={{
          ...(height === undefined ? { aspectRatio: ratio } : { height }),
          ...(background ? { background } : null),
          ...style,
        }}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading={loading}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition }}
          />
        ) : null}

        {children}

        {topLeft ? <span className="absolute left-2 top-2 z-10">{topLeft}</span> : null}
        {topRight ? <span className="absolute right-2 top-2 z-10">{topRight}</span> : null}
        {bottomLeft ? <span className="absolute bottom-2 left-2 z-10">{bottomLeft}</span> : null}
        {bottomRight ? <span className="absolute bottom-2 right-2 z-10">{bottomRight}</span> : null}
      </div>
    );
  },
);

CardMedia.displayName = "CardMedia";
