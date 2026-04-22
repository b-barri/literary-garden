import type { APIRoute } from "astro";
import { siteConfig } from "~/site.config";

// Dynamic PWA manifest — reads siteConfig so the installed-app name
// stays in sync with the owner-config edit. Replaces the static
// public/manifest.webmanifest which could drift out of sync.
//
// Astro prerenders this endpoint at build time into the static output,
// so no runtime cost and no SSR required.

export const GET: APIRoute = () => {
  const manifest = {
    name: siteConfig.siteTitle,
    short_name: "Garden",
    description: siteConfig.tagline,
    start_url: "/practice",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F2E4",
    theme_color: "#34472F",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "Content-Type": "application/manifest+json" },
  });
};
