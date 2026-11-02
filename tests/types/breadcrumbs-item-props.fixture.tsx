/**
 * Type fixture, compiled by `breadcrumbs-item-props.types.test.ts`.
 *
 * NOT a test file and never executed: vitest does not collect `*.fixture.tsx`.
 * It exists to be handed to the TypeScript compiler, because `tsconfig.json`
 * covers `src` only and nothing else in this repo type-checks a test.
 *
 * Every line here must compile, and every `@ts-expect-error` must be needed.
 * An unused `@ts-expect-error` is itself a compile error, so the negative
 * cases cannot pass by the type quietly becoming too loose.
 */
import { Breadcrumbs } from "../../src/components/Breadcrumbs";
import type { BreadcrumbsItemProps } from "../../src/components/Breadcrumbs";

// The request: `title` on a crumb whose text is truncated.
export const withTitle = (
  <Breadcrumbs>
    <Breadcrumbs.Item href="/a" title="A very long project name">
      A very long…
    </Breadcrumbs.Item>
    <Breadcrumbs.Item onClick={() => undefined} title="Back to src">
      src
    </Breadcrumbs.Item>
    <Breadcrumbs.Item active title="The current page">
      here
    </Breadcrumbs.Item>
  </Breadcrumbs>
);

// Other element attributes that `...rest` already forwards at runtime.
export const withAttributes = (
  <Breadcrumbs.Item
    id="crumb-1"
    style={{ maxWidth: 120 }}
    aria-label="Project: Fancy"
    role="link"
    tabIndex={0}
    onMouseEnter={() => undefined}
    onFocus={() => undefined}
  >
    x
  </Breadcrumbs.Item>
);

// Existing usages keep compiling unchanged.
export const existing = (
  <Breadcrumbs separator="/" shrink className="x">
    <Breadcrumbs.Item href="/" className="y">
      Home
    </Breadcrumbs.Item>
    <Breadcrumbs.Item as="a" href="/b">
      B
    </Breadcrumbs.Item>
    <Breadcrumbs.Item active>C</Breadcrumbs.Item>
  </Breadcrumbs>
);

// `onClick` keeps its `() => void` signature: a no-argument callback.
const props: BreadcrumbsItemProps = { children: "x", onClick: () => undefined };
export const onClickSignature: (() => void) | undefined = props.onClick;

export const onClickWithEvent = (
  // @ts-expect-error -- onClick is `() => void`, so a handler REQUIRING the event is rejected
  <Breadcrumbs.Item onClick={(e: { button: number }) => void e.button}>x</Breadcrumbs.Item>
);

// Still a closed type: an unknown prop is an error, not silently accepted.
// @ts-expect-error -- not an attribute of any element
export const unknownProp = <Breadcrumbs.Item notAnAttribute>x</Breadcrumbs.Item>;

// `children` stays required.
// @ts-expect-error -- children is required
export const noChildren = <Breadcrumbs.Item href="/" />;
