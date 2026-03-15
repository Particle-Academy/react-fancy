import { useState, useMemo } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { EMOJI_DATA } from "../../data/emoji-data";
import { search } from "../../data/emoji-utils";
import type { EmojiSelectProps } from "./EmojiSelect.types";

export function EmojiSelect({
  value,
  defaultValue,
  onChange,
  placeholder = "Search emojis...",
  className,
}: EmojiSelectProps) {
  const [selected, setSelected] = useControllableState(
    value,
    defaultValue ?? "",
    onChange,
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return EMOJI_DATA;
    const results = search(query);
    return [{ category: "Results", emojis: results }];
  }, [query]);

  return (
    <div className={cn("relative inline-block", className)} data-react-fancy-emoji-select="">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="text-xl">{selected}</span>
        ) : (
          <span className="text-zinc-400">Pick emoji</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 fancy-fade-in">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="mb-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((group) => (
              <div key={group.category}>
                <div className="px-1 py-1 text-xs font-semibold text-zinc-500 uppercase">
                  {group.category}
                </div>
                <div className="flex flex-wrap">
                  {group.emojis.map((emoji, i) => (
                    <button
                      key={`${emoji}-${i}`}
                      type="button"
                      className="p-1 text-xl hover:bg-zinc-100 rounded dark:hover:bg-zinc-700"
                      onClick={() => {
                        setSelected(emoji);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
