// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Fully static. The scene is one React island that renders only in the
// browser; Cloudflare Workers serves ./dist via `assets.directory`.
export default defineConfig({
  site: "https://oasis.parzival.computer",
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
