import { format, isToday, isYesterday, parseISO } from "date-fns";

export function formatLastPlayed(playedAt: string | null): string {
    if (!playedAt) return "N/A";
    try {
        const date = parseISO(playedAt);
        return format(date, "M/d/yyyy");
    } catch {
        return playedAt;
    }
}

export function formatPlayedAt(playedAt: string): string {
    try {
        const date = parseISO(playedAt);
        if (isToday(date)) {
            return `Today at ${format(date, "h:mm a")}`;
        } else if (isYesterday(date)) {
            return `Yesterday at ${format(date, "h:mm a")}`;
        } else {
            return format(date, "MMM d, yyyy 'at' h:mm a");
        }
    } catch {
        return playedAt;
    }
}

export function formatDuration(ms: number | null): string {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDateLabel(dateKey: string): string {
    if (dateKey === "unknown") return dateKey;
    try {
        const date = parseISO(dateKey);
        if (isToday(date)) {
            return "Today";
        } else if (isYesterday(date)) {
            return "Yesterday";
        } else {
            return format(date, "MMMM d, yyyy");
        }
    } catch {
        return dateKey;
    }
}
