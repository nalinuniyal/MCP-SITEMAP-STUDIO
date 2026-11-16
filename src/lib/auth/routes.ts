/** Routes reachable without a session. Everything else requires sign-in. */
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));
}

/**
 * Only allow same-origin relative redirects ("/dashboard", "/projects/x?tab=1").
 * Rejects absolute URLs, protocol-relative URLs ("//evil.com") and
 * backslash tricks ("/\\evil.com") to prevent open redirects.
 */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
