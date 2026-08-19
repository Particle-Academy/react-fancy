import { describe, expect, it } from "vitest";
import { cn } from "../src/utils/cn";

/**
 * `cn` is the class-name joiner every component funnels through, so its
 * behaviour is a contract even though it looks like a one-liner.
 *
 * These were written while `clsx` was still the implementation, to pin what it
 * actually did before replacing it. `clsx` was a runtime dependency shipped to
 * every consumer of this package, ~20 lines of logic, whose last commit was 801
 * days old — the kind of thing the suite should own rather than import.
 *
 * The tailwind-merge half is deliberately still a dependency: resolving which
 * of two conflicting Tailwind utilities wins requires knowing the whole utility
 * space, which is emphatically not twenty lines.
 */
describe("cn", () => {
    it("joins plain strings", () => {
        expect(cn("a", "b")).toBe("a b");
    });

    it("ignores every falsy value, including 0 and empty string", () => {
        expect(cn("a", false, null, undefined, "", 0, "b")).toBe("a b");
    });

    it("keeps truthy numbers, which are legal class names", () => {
        expect(cn("a", 1)).toBe("a 1");
    });

    it("flattens arrays, including nested ones", () => {
        expect(cn(["a", ["b", ["c"]]])).toBe("a b c");
    });

    it("takes object keys whose value is truthy", () => {
        expect(cn({ a: true, b: false, c: 1, d: 0 })).toBe("a c");
    });

    it("mixes all three forms", () => {
        expect(cn("a", ["b", { c: true, d: false }], null, { e: true })).toBe("a b c e");
    });

    it("still resolves conflicting Tailwind utilities — the tailwind-merge half", () => {
        expect(cn("p-2", "p-4")).toBe("p-4");
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("returns an empty string for nothing at all", () => {
        expect(cn()).toBe("");
        expect(cn(false, null, undefined)).toBe("");
    });
});
