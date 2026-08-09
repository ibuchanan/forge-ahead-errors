import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/errors.ts",
    testing: "./src/testing.ts",
  },
  format: ["esm", "cjs"],
  sourcemap: true,
  target: "node22",
  deps: {
    neverBundle: ["vitest"],
  },
});
