/** Build a context-aware label for a music detail page's Back button. */
export function getBackLabel(path: string): string {
  const [pathname] = path.split("?");
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/music") return "Back to Music";
  if (pathname === "/music/tracks") return "Back to Tracks";
  if (pathname === "/music/artists") return "Back to Artists";
  if (pathname === "/music/albums") return "Back to Albums";
  if (pathname === "/music/history") return "Back to History";

  if (pathname.startsWith("/music/artists/") && segments[2]) {
    return `Back to ${decodeURIComponent(segments[2])}`;
  }
  if (pathname.startsWith("/music/albums/") && segments[2]) {
    return `Back to ${decodeURIComponent(segments[2])}`;
  }
  if (pathname.startsWith("/music/tracks/") && segments[2]) {
    return `Back to ${decodeURIComponent(segments[2])}`;
  }

  return "Back";
}

/** Append the active ranking window as `days` so detail payloads stay scoped. */
export function withDaysParam(path: string, period: string | null): string {
  if (!period || period === "all") return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}days=${encodeURIComponent(period)}`;
}
