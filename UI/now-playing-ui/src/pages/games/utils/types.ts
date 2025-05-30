export interface SteamAchievement {
    description: string;
    image: string;
    name: string;
    unlock_time?: string;
    unlocked: boolean;
}
export interface SteamGame {
    achievements: SteamAchievement[];
    appid: number;
    content_descriptorids: number[];
    has_community_visible_stats: boolean;
    img_icon_url: string;
    name: string;
    playtime_forever: number;
    playtime_formatted: string;
    last_played: string;
    total_achievements: number;
    unlocked_achievements: number;
    unlocked_achievements_count: number;
    locked_achievements_count: number;
}

export interface PsnAchievement {
    description: string;
    image: string;
    name: string;
    type: string;
    unlock_time?: string;
    unlocked: boolean;
}

interface AchievementDetails {
    platinum?: number;
    gold?: number;
    silver?: number;
    bronze?: number;
}

export interface PsnGame {
    achievements: PsnAchievement[];
    appid: string;
    first_played: string;
    img_icon_url: string;
    last_played: string;
    name: string;
    platform: string;
    total_playtime: string;
    unlocked_achievements: AchievementDetails;
    total_achievements: AchievementDetails;
}

export interface RetroAchievementsAchievement {
    achievement_id: number;
    name: string;
    description: string;
    image: string;
    points: number;
    true_ratio: number;
    unlock_time: string;
    display_order: number;
    type: string;
    unlocked: boolean;
}

export interface RetroAchievementsGame {
    appid: number;
    name: string;
    console_name: string;
    image_icon: string;
    image_title: string;
    image_ingame: string;
    img_icon_url: string;

    last_played: string;
    total_achievements: number;
    unlocked_achievements: number;
    locked_achievements: number;
    score_achieved: number;
    achievements: RetroAchievementsAchievement[];
}

export interface XboxAchievement {
    name: string;
    description: string;
    image: string;
    unlocked: boolean;
    unlock_time: string;
    achievement_value: string;
}
export interface XboxGame {
    appid: number;
    name: string;
    platform: string;
    total_playtime: string;
    first_played: string;
    last_played: string;
    img_icon_url: string;
    achievements: XboxAchievement[];
    total_achievements: number;
    unlocked_achievements: number;
    locked_achievements: number;
}
