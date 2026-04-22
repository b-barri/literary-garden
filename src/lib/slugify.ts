// Whitelist slugifier for URL hashes and file names.
// Cap at 64 chars to keep hashes readable; drop leading dots so the
// result never starts with "." (avoids hidden-file traps on macOS).

export function slugify(input: string): string {
  const normalised = input
    .normalize("NFKD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return normalised.slice(0, 64);
}
