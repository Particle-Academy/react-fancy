import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import ts from "typescript";

/**
 * `BreadcrumbsItemProps` accepts the element's HTML attributes.
 *
 * `BreadcrumbsItem` spreads `...rest` onto whichever element it renders, so
 * `title`, `id`, `aria-*` and handlers all WORKED at runtime, while the props
 * type listed its keys by hand and rejected them. Genie cast around the type to
 * put `title` on crumbs it truncates.
 *
 * A real type check, not a grep of the source. `tsconfig.json` includes `src`
 * only, so a type assertion written in a test file is never compiled by
 * `npm run lint` and proves nothing (composer-paste-pill.test.tsx records
 * finding that out the hard way). This compiles a fixture with the TypeScript
 * compiler the repo already has, under the repo's own compiler options, and
 * fails on any diagnostic -- including an unused `@ts-expect-error`, which is
 * how the negative cases are held.
 */
describe("BreadcrumbsItemProps type", () => {
  it("compiles the fixture with no diagnostics", () => {
    const root = process.cwd();
    const configPath = resolve(root, "tsconfig.json");
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);

    const fixture = resolve(root, "tests/types/breadcrumbs-item-props.fixture.tsx");
    const program = ts.createProgram([fixture], { ...options, noEmit: true, declaration: false, declarationMap: false, sourceMap: false });

    const messages = ts
      .getPreEmitDiagnostics(program)
      .map((d) => {
        const text = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (!d.file || d.start === undefined) return text;
        const { line } = d.file.getLineAndCharacterOfPosition(d.start);
        return `${d.file.fileName.replace(/\\/g, "/").split("/").slice(-2).join("/")}:${line + 1} ${text}`;
      });

    // Precondition: the fixture really was part of the program. Without it a
    // wrong path would make "no diagnostics" vacuously true.
    expect(program.getSourceFile(fixture)).toBeDefined();
    expect(messages).toEqual([]);
  }, 60_000);
});
