/**
 * Detect a "nothing changed" transform and return the notice to show for it.
 *
 * A transform is a no-op when its output is byte-for-byte identical to the
 * input. Without feedback this reads as "the button did nothing" — most often
 * hit by casing tools run on text that has no cased characters at all (emoji,
 * CJK, Arabic/Hebrew, mathematical-styled letters), which have no upper/lower
 * form to convert to.
 *
 * Returns the message to surface (as an `info` alert), or `null` when the
 * result actually differs — the caller shows the normal success toast then.
 */
export function noopNotice(
  original: string,
  result: string,
  toolGroup?: string
): string | null {
  if (result !== original) return null;

  // Casing tools no-op two ways: the text has no cased characters, or it's
  // already in the target form. Only the first is worth explaining. A string
  // contains at least one cased character iff lower- and upper-casing it yield
  // different strings — this also correctly flags math-styled letters and
  // emoji as caseless, since JS leaves those unchanged by case mapping.
  if (toolGroup === 'case' && original.toLowerCase() === original.toUpperCase()) {
    return 'No cased characters to change — emoji, symbols, and scripts like CJK have no upper/lowercase form.';
  }

  return 'No changes — the result is identical to your input.';
}
