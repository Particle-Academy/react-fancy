import { cn } from "../../utils/cn";
import { useTreeNav } from "./TreeNav.context";
import type { TreeNodeProps } from "./TreeNav.types";

const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f7df1e",
  jsx: "#f7df1e",
  php: "#777bb4",
  html: "#e34c26",
  htm: "#e34c26",
  css: "#264de4",
  json: "#a1a1aa",
  md: "#71717a",
  yaml: "#cb171e",
  yml: "#cb171e",
};

function FileIcon({ ext }: { ext?: string }) {
  const color = (ext && EXT_COLORS[ext.toLowerCase()]) || "#71717a";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M4 1h5.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke={color} strokeWidth="1.2" />
      <path d="M9 1v4h4" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M1.5 3.5a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V5H2.5V3.5z" fill="#fbbf24" />
        <path d="M1 6h13l-1.5 7.5H2.5L1 6z" fill="#fbbf24" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M1.5 3a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1v8a1 1 0 01-1 1H2.5a1 1 0 01-1-1V3z" fill="#fbbf24" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 transition-transform duration-150", open && "rotate-90")}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function TreeNode({ node, depth }: TreeNodeProps) {
  const { selectedId, onSelect, expandedIds, toggle, indentSize, showIcons } = useTreeNav();

  const isFolder = node.type === "folder" || (node.children && node.children.length > 0);
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedId === node.id;
  const paddingLeft = depth * indentSize + 4;

  const handleClick = () => {
    if (node.disabled) return;
    if (isFolder) {
      toggle(node.id);
    }
    onSelect?.(node.id, node);
  };

  return (
    <div data-react-fancy-tree-node="">
      <button
        type="button"
        onClick={handleClick}
        disabled={node.disabled}
        className={cn(
          "flex w-full items-center gap-1 rounded-md py-0.5 text-left text-[13px] transition-colors",
          isSelected
            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
          node.disabled && "pointer-events-none opacity-40",
        )}
        style={{ paddingLeft }}
      >
        {isFolder && <ChevronIcon open={isExpanded} />}
        {!isFolder && <span className="w-3.5 shrink-0" />}
        {showIcons && (
          node.icon ?? (isFolder
            ? <FolderIcon open={isExpanded} />
            : <FileIcon ext={node.ext ?? node.label.split(".").pop()} />)
        )}
        <span className="truncate">{node.label}</span>
      </button>

      {isFolder && isExpanded && node.children && (
        <div data-react-fancy-tree-node-children="">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

TreeNode.displayName = "TreeNode";
