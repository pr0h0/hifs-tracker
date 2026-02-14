export const RATING_CONFIG = {
  1: {
    label: "Just Started",
    bg: "bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-500/30",
    fill: "hsl(0, 84%, 60%)",
  },
  2: {
    label: "Struggling",
    bg: "bg-orange-500/15",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500/30",
    fill: "hsl(25, 95%, 53%)",
  },
  3: {
    label: "Getting There",
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
    fill: "hsl(38, 92%, 50%)",
  },
  4: {
    label: "Almost Solid",
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-500/30",
    fill: "hsl(199, 89%, 48%)",
  },
  5: {
    label: "Mastered",
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    fill: "hsl(160, 84%, 39%)",
  },
} as const;

export type Rating = 1 | 2 | 3 | 4 | 5;

export function getRatingConfig(rating: number | null) {
  if (!rating || rating < 1 || rating > 5) {
    return {
      label: "Not Rated",
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
      fill: "hsl(0, 0%, 70%)",
    };
  }
  return RATING_CONFIG[rating as Rating];
}

export const STATUS_CONFIG = {
  learned: {
    label: "Learned",
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  learning: {
    label: "Learning",
    bg: "bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-400",
  },
  planned: {
    label: "Planned",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
} as const;

export type Status = "learned" | "learning" | "planned";

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as Status] || STATUS_CONFIG.planned;
}
