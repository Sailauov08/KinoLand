import clsx from "clsx";
import { formatRating } from "@/lib/format";
import { StarIcon } from "./icons";

export function RatingPill({ value, className }: { value: number; className?: string }) {
  const tone = value >= 7.5 ? "text-accent" : value >= 6 ? "text-fg" : "text-muted";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[0.72rem] font-bold tabular-nums ring-1 ring-white/12 backdrop-blur-md",
        tone,
        className,
      )}
    >
      <StarIcon size={12} className="fill-current" strokeWidth={0} />
      {formatRating(value)}
    </span>
  );
}
