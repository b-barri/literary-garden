// Owner-facing config. After cloning this template:
//
//   cp src/site.config.example.ts src/site.config.ts
//
// Then edit src/site.config.ts with your values. The .ts file is
// gitignored so your personal details don't accidentally upstream into
// the template repo.
//
// The values here flow into page titles, nav aria-labels, the home-page
// signature, the share-card "from X's literary garden" caption, the OG
// social card, and the PWA manifest name.
//
// Note: public/manifest.webmanifest is a static JSON and cannot import
// this file. If you change `siteTitle`, also update manifest.webmanifest's
// `name` field to match.

export interface SiteConfig {
  /** Shown in page headings, signature, and nav aria-labels. */
  ownerName: string;
  /** Used as the default HTML <title> and manifest name. */
  siteTitle: string;
  /** Short hook phrase — reserved for future home-page use. */
  tagline: string;
  /** Path to the OG image served from /public. Served as og:image. */
  socialImage: string;
  /** Path to the personal wax-seal stamp used on share cards. Falls back
   *  to /stamp-default.svg if the referenced file is missing. */
  stampImage: string;
}

export const siteConfig: SiteConfig = {
  ownerName: "Your Name",
  siteTitle: "Your Name's Literary Garden",
  tagline: "a gentle reader's notes",
  socialImage: "/og-image.png",
  stampImage: "/stamp-default.svg",
};

/** True when siteConfig still has the template's placeholder values.
 *  Used in dev mode to print a "please edit site.config.ts" console
 *  warning. Never shown in production builds. */
export const IS_PLACEHOLDER =
  siteConfig.ownerName === "Your Name" ||
  siteConfig.siteTitle === "Your Name's Literary Garden";
