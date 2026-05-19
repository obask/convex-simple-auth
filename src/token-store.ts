/**
 * Framework-free JWT store backed by `localStorage`.
 *
 * Used by `convex-simple-auth/react` and `convex-simple-auth/solid`. Safe to
 * import directly if you want to wire up a custom framework binding.
 */
const KEY = "convex_jwt";
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

export const tokenStore = {
  get: (): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(KEY),
  set: (token: string) => {
    window.localStorage.setItem(KEY, token);
    emit();
  },
  clear: () => {
    window.localStorage.removeItem(KEY);
    emit();
  },
};

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
