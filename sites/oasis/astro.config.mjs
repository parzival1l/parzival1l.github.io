// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// DRACOLoader points at three's bundled decoders with
// `new URL(..., import.meta.url)`, so Vite copies all five files (1.3 MB)
// into _astro/. The scene loads its decoder from /oasis/draco/ instead,
// so those copies never ship to a browser. Blank the URLs before Vite sees them.
/** @returns {import("vite").Plugin} */
function dropBundledDracoDecoders() {
  return {
    name: "drop-bundled-draco-decoders",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("/three/examples/jsm/loaders/DRACOLoader.js")) return;
      let count = 0;
      const out = code.replace(
        /new URL\(\s*'\.\.\/libs\/draco\/[^']+',\s*import\.meta\.url\s*\)\.toString\(\)/g,
        () => {
          count++;
          return "''";
        },
      );
      if (count === 0) this.error("DRACOLoader changed shape; update dropBundledDracoDecoders");
      return { code: out, map: null };
    },
  };
}

// Fully static. The scene is one React island that renders only in the
// browser; Cloudflare Workers serves ./dist via `assets.directory`.
export default defineConfig({
  site: "https://oasis.parzival.computer",
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss(), dropBundledDracoDecoders()] },
});
