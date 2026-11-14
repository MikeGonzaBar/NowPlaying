import { GameData, PsnGame, RetroAchievementsGame, SteamGame, XboxGame, EpicGame } from "./types";

export const isEpicGame = (game: GameData): game is EpicGame => {
  // Epic products are keyed by namespace/catalog id strings and always expose
  // playtime_known; Steam is the fallback branch, so this must be checked first.
  return (
    typeof (game as EpicGame).namespace === "string" &&
    typeof (game as EpicGame).playtime_known === "boolean"
  );
};

export const isPsnGame = (game: GameData): game is PsnGame => {
  return (
    (game as PsnGame).platform !== undefined &&
    typeof (game as PsnGame).unlocked_achievements === "object" &&
    (game as PsnGame).unlocked_achievements !== null &&
    !Array.isArray((game as PsnGame).unlocked_achievements) &&
    ("bronze" in (game as PsnGame).unlocked_achievements ||
      "silver" in (game as PsnGame).unlocked_achievements ||
      "gold" in (game as PsnGame).unlocked_achievements ||
      "platinum" in (game as PsnGame).unlocked_achievements)
  );
};

export const isXboxGame = (game: GameData): game is XboxGame => {
  const hasplatform = "platform" in game;
  const unlocked = (game as any).unlocked_achievements;
  const hasNumericUnlocked = typeof unlocked === "number";
  const platform = (game as any).platform;
  const platformMatches =
    hasplatform &&
    typeof platform === "string" &&
    ["XboxOne", "XboxSeries", "PC", "Xbox360"].some((plat) =>
      platform.includes(plat),
    );

  return hasplatform && hasNumericUnlocked && platformMatches;
};

export const isRetroAchievementsGame = (
  game: GameData,
): game is RetroAchievementsGame => {
  return (game as RetroAchievementsGame).console_name !== undefined;
};

export const isSteamGame = (game: GameData): game is SteamGame => {
  return (
    !isEpicGame(game) && !("platform" in game) && !("console_name" in game)
  );
};
