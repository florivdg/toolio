/**
 * Intl currency output separates the amount from the symbol with a non-breaking
 * space (U+00A0, and U+202F in some locales since ICU 72). Comparing against a
 * literal typed with an ordinary space fails in a way that is invisible in the
 * diff, so normalise those to U+0020 before asserting.
 */
export function normalizeSpaces(value: string): string {
  return value.replace(/[   ]/g, ' ')
}
