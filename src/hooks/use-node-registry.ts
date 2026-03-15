import { useCallback, useRef, useState } from "react";

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseNodeRegistryReturn {
  registerNode: (id: string, rect: NodeRect) => void;
  unregisterNode: (id: string) => void;
  nodeRects: Map<string, NodeRect>;
  version: number;
}

export function useNodeRegistry(): UseNodeRegistryReturn {
  const rectsRef = useRef(new Map<string, NodeRect>());
  const [version, setVersion] = useState(0);

  const registerNode = useCallback((id: string, rect: NodeRect) => {
    rectsRef.current.set(id, rect);
    setVersion((v) => v + 1);
  }, []);

  const unregisterNode = useCallback((id: string) => {
    rectsRef.current.delete(id);
    setVersion((v) => v + 1);
  }, []);

  return { registerNode, unregisterNode, nodeRects: rectsRef.current, version };
}
