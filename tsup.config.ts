import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/browser.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  ignoreWatch: ["**/*.test.ts"],
});
