"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface RatingStarsProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function RatingStars({
  value,
  onChange,
  readonly = false,
  size = "md",
}: RatingStarsProps) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const filled = value !== null && starValue <= value;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            className={cn(
              "transition-colors",
              readonly
                ? "cursor-default"
                : "cursor-pointer hover:text-amber-400",
            )}
            aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                starSize,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
