import { cn } from "@/lib/utils";
import { getRatingConfig } from "@/lib/rating-colors";

interface RatingBadgeProps {
  rating: number | null;
  className?: string;
}

export function RatingBadge({ rating, className }: RatingBadgeProps) {
  const config = getRatingConfig(rating);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {rating ? (
        <>
          <span className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  i < rating
                    ? "bg-current opacity-100"
                    : "bg-current opacity-20",
                )}
              />
            ))}
          </span>
          {config.label}
        </>
      ) : (
        config.label
      )}
    </span>
  );
}
