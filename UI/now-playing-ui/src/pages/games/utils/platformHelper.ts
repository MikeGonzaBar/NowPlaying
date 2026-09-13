import { SteamGame, PsnGame, RetroAchievementsGame, XboxGame } from "./types";

const platformConfig = [
  {
    key: "platform",
    value: "PS5",
    src: "/Platforms/playstation-5.webp",
    alt: "PS5 Logo",
    width: "45px",
  },
  {
    key: "platform",
    value: "PS4",
    src: "/Platforms/playstation-4.png",
    alt: "PS4 Logo",
    width: "45px",
  },
  {
    key: "console_name",
    value: "PlayStation 2",
    src: "/Platforms/playstation-2.png",
    alt: "PS2 Logo",
    width: "45px",
  },
  {
    key: "platform",
    value: "PC, XboxOne, XboxSeries, Xbox360",
    src: "/Platforms/xbox.svg",
    alt: "XBOX Logo",
    width: "55px",
  },
  {
    key: "console_name",
    value: "PlayStation",
    src: "/Platforms/playstation.webp",
    alt: "PS1 Logo",
    width: "25px",
  },
  {
    key: "console_name",
    value: "Nintendo DS",
    src: "/Platforms/nintendo-ds.png",
    alt: "Nintendo DS Logo",
    width: "80px",
  },
  {
    key: "console_name",
    value: "Game Boy Color",
    src: "/Platforms/gameboy-color.png",
    alt: "Game Boy Color Logo",
    width: "50px",
  },
  {
    key: "console_name",
    value: "Game Boy Advance",
    src: "/Platforms/gameboy-advance.png",
    alt: "Game Boy Advance Logo",
    width: "85px",
  },
  {
    key: "default",
    value: "Steam",
    src: "/Platforms/steam.webp",
    alt: "Steam Logo",
    width: "30px",
  },
];

/**
 * Service-level platform config (single source for display names/colors).
 * Distinct from the logo-matching `platformConfig` above, which maps a game's
 * platform/console fields to a logo asset.
 */
export const SERVICE_PLATFORM_CONFIG = {
  steam: { name: "Steam", color: "#1b2838" },
  psn: { name: "PlayStation", color: "#003791" },
  xbox: { name: "Xbox", color: "#107c10" },
  retroachievements: { name: "RetroAchievements", color: "#ff6b35" },
} as const;

export const getPlatformMatch = (
  game: SteamGame | PsnGame | RetroAchievementsGame | XboxGame,
) => {
  const matchedPlatform = platformConfig.find(({ key, value }) => {
    if (key === "default") return false;
    if (!(key in game)) return false;

    const gameValue = (game as Record<string, any>)[key];
    if (typeof gameValue !== "string") return false;

    const gameValues = gameValue.split(",").map((v) => v.trim().toLowerCase());
    const configValues = value.split(",").map((v) => v.trim().toLowerCase());

    return configValues.some((configVal) => gameValues.includes(configVal));
  });

  return matchedPlatform || platformConfig.find((cfg) => cfg.key === "default");
};
