import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "takumi-markdown": resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        // Keep wasm-pack generated files external (loaded at runtime)
        /\/pkg\//,
        /takumi_wasm/,
      ],
    },
    outDir: "dist",
    sourcemap: true,
    cssCodeSplit: false,
  },
});
