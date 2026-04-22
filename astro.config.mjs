import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // html-to-image's pre-bundling via Vite's dep optimizer hangs on
      // its DOM-traversal code paths (dynamic-import chain + SVG-foreign-
      // object serializer). Forcing Vite to include it via `include` makes
      // it pre-bundle at server-start — reliable, no 504s from on-demand
      // optimization mid-session.
      include: ["html-to-image"],
    },
  },
  site: "http://localhost:4321",
});
