// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PdfViewer } from "../src/components/PdfViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * No component renders a `<style>` element in the body.
 *
 * The HTML content model allows `<style>` in `<head>` (and in `<noscript>`
 * there), not as the child of a `<div>`. html-validate reports it as "<style>
 * element is not permitted as content under <div>", and the lab's html-validate
 * gate fails a site on it. PdfViewer's page-image mode rendered its print-block
 * CSS as `<style>` inside the viewer's root `<div>` whenever `policy.print` was
 * false. That rule now ships in styles.css, keyed on the `data-print-blocked`
 * attribute the root already carried, so the viewer renders no `<style>` at all
 * and blanks in print exactly as before.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const blocked = () => (
  <PdfViewer pages={{ count: 2, url: (p: number, s: number) => `/doc/7/page/${p}.png?scale=${s}` }} policy={{ print: false }} />
);

/** Every `<style>` that sits under a `<div>` in `root`. */
const stylesInDivs = (root: ParentNode) => Array.from(root.querySelectorAll("div style"));

describe("no <style> element under a <div>", () => {
  it("PdfViewer with print: false, rendered on the client", () => {
    const host = mount(blocked());
    // Guard: the policy really applied, so the old code path was the one taken.
    expect(host.querySelector("[data-react-fancy-pdf-viewer]")?.getAttribute("data-print-blocked")).toBe("true");
    expect(stylesInDivs(document.body).map((s) => s.outerHTML.slice(0, 80))).toEqual([]);
  });

  it("PdfViewer with print: false, rendered on the server", () => {
    const html = renderToString(blocked());
    const doc = new DOMParser().parseFromString(`<!doctype html><html><head></head><body><div id="app">${html}</div></body></html>`, "text/html");
    expect(doc.querySelector("[data-react-fancy-pdf-viewer]")?.getAttribute("data-print-blocked")).toBe("true");
    expect(stylesInDivs(doc.body).map((s) => s.outerHTML.slice(0, 80))).toEqual([]);
    expect(doc.body.querySelectorAll("style").length).toBe(0);
  });

  it("no component source renders a <style> element", () => {
    const SRC = path.resolve(__dirname, "../src/components");
    const files: string[] = [];
    (function walk(d: string) {
      for (const n of readdirSync(d)) {
        const p = path.join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (n.endsWith(".tsx")) files.push(p);
      }
    })(SRC);
    expect(files.length).toBeGreaterThan(100);
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const offenders = files.filter((f) => /<style[\s>]/.test(strip(readFileSync(f, "utf8"))));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});

describe("the print block still ships", () => {
  const css = readFileSync(path.resolve(__dirname, "../src/styles.css"), "utf8");

  it("styles.css hides a print-blocked viewer and every descendant in print", () => {
    const flat = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
    const media = flat.match(/@media print \{([^{}]*)\{([^{}]*)\}/);
    expect(media, "no @media print block").not.toBeNull();
    const selectors = media![1].split(",").map((s) => s.trim());
    expect(selectors).toContain('[data-react-fancy-pdf-viewer][data-print-blocked="true"]');
    expect(selectors).toContain('[data-react-fancy-pdf-viewer][data-print-blocked="true"] *');
    expect(media![2].replace(/\s/g, "")).toContain("visibility:hidden!important");
  });
});
