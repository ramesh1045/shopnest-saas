/**
 * Convert a string to a URL-safe slug.
 * Example: "Sri Fashion Store!" -> "sri-fashion-store"
 */
export function slugify(input: string, maxLength = 80): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

/**
 * Ensure the slug is unique by appending a suffix if needed.
 * Caller supplies a function that returns true if slug already exists.
 */
export async function ensureUniqueSlug(
  base: string,
  existsFn: (candidate: string) => Promise<boolean>
): Promise<string> {
  let candidate = base || 'store-' + Date.now();
  let counter = 1;
  while (await existsFn(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
    if (counter > 1000) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}