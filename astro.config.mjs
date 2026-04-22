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
  // `site` is the canonical base URL used for OG meta tags (og:url,
  // absolute og:image) and sitemap generation. Dev-default is localhost
  // so local builds produce valid-looking tags. **Update this to your
  // Vercel/Cloudflare deployment URL before your first production build**
  // so LinkedIn/Twitter/etc. can fetch the og-image.
  site: "http://localhost:4321",
});
