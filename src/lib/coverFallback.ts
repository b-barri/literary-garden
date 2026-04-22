const NUM_PLACEHOLDERS = 4;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function placeholderCoverSrc(seed: string): string {
  const n = (hashString(seed) % NUM_PLACEHOLDERS) + 1;
  return `/covers/placeholders/${n}.jpg`;
}
