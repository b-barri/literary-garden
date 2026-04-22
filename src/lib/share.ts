// DOM → PNG → share/download pipeline for quote cards.
//
// Strategy:
//   1. Render the ShareCard at its native export size (1080×1350) off-screen.
//   2. Use html-to-image to serialize the DOM subtree into a PNG blob.
//      html-to-image uses SVG foreignObject + canvas, preserving CSS
//      features (letter-spacing, filters, text-shadow) that html2canvas
//      would drop.
//   3. On mobile (and desktop Safari), hand the blob to the Web Share API
//      so the native share sheet opens with WhatsApp/Messages/Instagram/etc.
//      On unsupported browsers, fall back to a download.
//
// Why we import html-to-image *statically* rather than dynamically:
//   Originally this file did `await import("html-to-image")` to keep the
//   library out of the initial bundle until share was triggered. On iOS
//   Safari, accessing the Vite dev server through a Cloudflare Quick
//   Tunnel, that dynamic import throws `Importing a module script failed` —
//   Vite's ESM dev resolution doesn't round-trip cleanly through the
//   tunnel for iOS's strict module-script MIME checks. Static import
//   bundles the ~20 KB into the main chunk so share works reliably
//   regardless of hosting shape. Cost: 20 KB on pages that don't use
//   share — well within budget for a static site.
import { toBlob } from "html-to-image";

export interface ShareOptions {
  /** Title passed to the Web Share sheet (shown as subject on some targets). */
  title?: string;
  /** Caption text shared alongside the file (e.g., "a passage from ...") */
  text?: string;
  /** Download filename when fallback is triggered. ".png" appended if missing. */
  filename?: string;
}

async function renderNodeToBlob(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    // 2× for retina; card is 1080×1350 CSS, becomes 2160×2700 PNG.
    pixelRatio: 2,
    cacheBust: true,
    // Use the card's own background; solid fallback for transparency.
    backgroundColor: undefined,
    // Keep all fonts — fall back to serving-side defaults if a CSS font
    // failed to load (the card specifies local generic families too).
    skipFonts: false,
    style: {
      // Ensure transforms applied by any wrapper don't distort the export.
      transform: "none",
      transformOrigin: "top left",
    },
  });
  if (!blob) throw new Error("Image generation returned null blob");
  return blob;
}

function normaliseFilename(name: string | undefined, fallback: string): string {
  const base = (name ?? fallback).replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 120);
  return base.endsWith(".png") ? base : `${base}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Must be appended to DOM in some older browsers to fire click.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the browser has consumed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Share the card via Web Share API when possible; fall back to download.
 *
 *  We try `navigator.share()` directly with the real file (not a probe).
 *  iOS Safari's `canShare()` returns `false` inconsistently for in-memory
 *  File objects even when `share()` would succeed with the same payload —
 *  skipping the probe lets the actual capability decide. If share is
 *  unsupported, unavailable, or errors, we fall through to download so
 *  the user still ends up with the image. `AbortError` means the user
 *  dismissed the sheet — treat as benign cancel, not failure.
 */
export async function sharePNG(
  node: HTMLElement,
  opts: ShareOptions = {},
): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await renderNodeToBlob(node);
  const filename = normaliseFilename(opts.filename, "passage");
  const file = new File([blob], filename, { type: "image/png" });

  // Try share if the API exists. Some browsers have `share` but not
  // `canShare` — we skip canShare entirely and let share() itself decide.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    // Gate on canShare IF it exists AND explicitly returns false. If
    // canShare is missing OR returns true, proceed to share().
    const canShareOrUnknown =
      !("canShare" in navigator) ||
      (() => {
        try {
          return navigator.canShare({ files: [file] });
        } catch {
          // Some browsers throw; treat as "we don't know, try anyway".
          return true;
        }
      })();

    if (canShareOrUnknown) {
      try {
        await navigator.share({
          files: [file],
          title: opts.title,
          text: opts.text,
        });
        return "shared";
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return "cancelled";
        // Any other error → fall through to download.
      }
    }
  }

  triggerDownload(blob, filename);
  return "downloaded";
}

/** Always download, regardless of share support. */
export async function downloadPNG(
  node: HTMLElement,
  opts: ShareOptions = {},
): Promise<void> {
  const blob = await renderNodeToBlob(node);
  const filename = normaliseFilename(opts.filename, "passage");
  triggerDownload(blob, filename);
}

/** Probe whether the native share sheet would accept a PNG file. */
export function canNativeShare(): boolean {
  if (typeof navigator === "undefined" || !("canShare" in navigator)) return false;
  // Probe with a minimal PNG-shaped File; most browsers resolve this
  // synchronously without actually opening the share sheet.
  try {
    const probe = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "p.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
