/**
 * Loads a module through Node's own ESM loader (with native TypeScript
 * type-stripping), bypassing the Vite transform pipeline entirely.
 * Must itself be loaded via createRequire() from a test so that the
 * dynamic import below runs with Node's import callback.
 */
export function loadNative<T>(url: string): Promise<T> {
  return import(/* @vite-ignore */ url) as Promise<T>;
}
