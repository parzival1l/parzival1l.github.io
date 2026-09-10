// @ts-check
import { defineConfig } from "astro/config";

// Fully static. No Cloudflare adapter until we need on-demand routes (/api).
// Cloudflare Workers serves ./dist via `assets.directory` in wrangler.jsonc.
export default defineConfig({
  site: "https://threadhop.parzival.computer",
  output: "static",
});
