import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/icons.ts", "src/styles.css"],
  format: ["esm", "cjs"],
  dts: { entry: ["src/index.ts", "src/icons.ts"] },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
});
