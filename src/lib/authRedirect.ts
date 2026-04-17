export function normalizeAuthNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(raw, window.location.origin);
    const nestedNext = url.searchParams.get("next");

    if ((url.pathname === "/auth/callback" || url.pathname === "/auth/confirm") && nestedNext) {
      return normalizeAuthNext(nestedNext);
    }

    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}