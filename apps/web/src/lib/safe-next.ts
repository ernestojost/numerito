/** Only same-site paths are allowed as a post-login destination (no open redirects). */
export function safeNext(value: string | string[] | undefined, fallback = "/panel") {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
