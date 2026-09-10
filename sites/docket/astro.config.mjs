// @ts-check
import { defineConfig } from "astro/config";

// Fully static. No Cloudflare adapter until we need on-demand routes.
// Cloudflare Workers serves ./dist via `assets.directory` in wrangler.jsonc.
export default defineConfig({
  site: "https://docket.parzival.computer",
  output: "static",
});
