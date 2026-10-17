// @vitest-environment jsdom
import { expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Toast } from "../src/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `Toast.Item` is documented — "if you render your own viewport, each item takes
 * data and onDismiss" — and its props type `ToastItemProps` was exported, but the
 * part itself was not. Following the docs gave `undefined` and a render crash.
 */
it("Toast.Item is reachable from the package, as documented", () => {
  expect(typeof Toast.Item).toBe("function");

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(<Toast.Item data={{ id: "t1", title: "Saved", duration: 0 }} onDismiss={() => {}} />),
  );

  expect(host.textContent).toContain("Saved");
  act(() => root.unmount());
  host.remove();
});
