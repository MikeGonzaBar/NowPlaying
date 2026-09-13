import React, { useState } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ImgHTMLAttributes } from "react";

/**
 * Inline SVG placeholder shown once every candidate URL has failed — the same
 * dark rectangle the game pages used to swap in manually via onError.
 */
const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjMTgxODFiIi8+Cjwvc3ZnPg==";

/** Extract the Steam appid from a Steam CDN URL, if present. */
export function steamAppIdFromUrl(url: string): string | null {
  const match = url.match(/steam\/apps\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Next URL to try after a game image failed to load, or null when the chain
 * is exhausted.
 *
 * Steam CDN sizes, most to least available:
 *   header.jpg              460x215   — present for virtually every app
 *   capsule_616x353.jpg     616x353   — most apps
 *   library_600x900.jpg     600x900   — "library" art, many apps missing it
 *   library_600x900_2x.jpg  1200x1800 — same art at 2x, same gaps
 * The library heroes are exactly what Steam library sync stores as
 * img_icon_url, and older/obscure apps (e.g. appid 740410) return 404 for
 * them. When the hero fails we fall back to header.jpg.
 */
export function nextFallbackUrl(url: string): string | null {
  if (url === PLACEHOLDER) return null;
  const appid = steamAppIdFromUrl(url);
  if (appid && /library_600x900(_2x)?\.jpg/.test(url)) {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
  }
  return null;
}

interface GameImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  sx?: SxProps<Theme>;
}

/**
 * Game cover image with a resilient fallback chain:
 *   stored URL -> header.jpg (Steam apps) -> inline placeholder.
 * All other <img> attributes (loading, width, height, style, ...) are
 * forwarded to the underlying img element.
 */
export const GameImage: React.FC<GameImageProps> = ({ src, alt, sx, ...rest }) => {
  // Derived state: restart the fallback chain whenever the requested URL
  // changes (React's sanctioned "adjust state during render" pattern).
  const [state, setState] = useState({ requested: src, current: src });
  if (state.requested !== src) {
    setState({ requested: src, current: src });
  }

  return (
    <Box
      component="img"
      src={state.current}
      alt={alt}
      sx={sx}
      {...rest}
      onError={() => {
        const next = nextFallbackUrl(state.current);
        setState((prev) => ({
          requested: prev.requested,
          current: next ?? PLACEHOLDER,
        }));
      }}
    />
  );
};