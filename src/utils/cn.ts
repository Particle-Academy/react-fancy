import { twMerge } from "tailwind-merge";

/**
 * A class value: a string, a number, a conditional map, an array of any of
 * those, or nothing. Mirrors what `clsx` accepted, because every component in
 * this package already passes these shapes.
 */
export type ClassValue =
  | string
  | number
  | bigint
  | null
  | undefined
  | false
  | ClassDictionary
  | ClassValue[];

type ClassDictionary = Record<string, unknown>;

/**
 * Flatten class values into a space-separated string.
 *
 * This was `clsx` until 2026-08-19. It is roughly twenty lines of logic, it
 * shipped as a RUNTIME dependency to every consumer of this package, and its
 * last commit was 801 days old — so it fell to the rule that third-party code
 * must be both approved and actively maintained. Owning it costs less than
 * carrying it.
 *
 * `tailwind-merge` deliberately stays: deciding which of two conflicting
 * Tailwind utilities wins requires modelling the entire utility space, which is
 * emphatically not twenty lines, and it is actively maintained.
 *
 * Falsy values are dropped — including `0` and `""`, which is what `clsx` did
 * and what `tests/cn.test.ts` pins. A truthy number is kept, because digits are
 * legal class names. `bigint` is admitted because clsx's signature did and
 * the compiler proved it reachable from two call sites here.
 */
function flatten(value: ClassValue): string {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (Array.isArray(value)) {
    let out = "";
    for (const item of value) {
      const part = flatten(item);
      if (part) out = out ? `${out} ${part}` : part;
    }
    return out;
  }

  let out = "";
  for (const key in value) {
    if (value[key]) out = out ? `${out} ${key}` : key;
  }
  return out;
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(flatten(inputs));
}
