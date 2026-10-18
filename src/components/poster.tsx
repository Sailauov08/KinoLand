import clsx from "clsx";
import Image from "next/image";
import { tmdbImage, type BackdropSize, type PosterSize } from "@/lib/movies/images";

/** Deterministic hue per movie so generated artwork is stable across renders. */
function hueFor(id: number) {
  return (Math.abs(id * 47) % 360 + 360) % 360;
}

/**
 * Typographic placeholder art for demo mode / missing posters. It is intentionally abstract
 * (no imitation of real key art) and carries a "demo artwork" label when `labelled`.
 */
export function GeneratedArt({
  id,
  title,
  year,
  variant = "poster",
  label,
  className,
}: {
  id: number;
  title: string;
  year?: number | null;
  variant?: "poster" | "backdrop" | "thumb";
  label?: string;
  className?: string;
}) {
  const h = hueFor(id);
  return (
    <div
      role="img"
      aria-label={title}
      className={clsx("absolute inset-0 overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 80% at 20% 0%, hsl(${h} 45% 30%) 0%, transparent 60%),
          radial-gradient(90% 70% at 100% 100%, hsl(${(h + 40) % 360} 50% 18%) 0%, transparent 70%),
          linear-gradient(160deg, hsl(${h} 25% 12%), #0b0a09)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 24px)",
          maskImage: "linear-gradient(to bottom, black, transparent 70%)",
        }}
      />
      {variant === "thumb" ? (
        <span className="absolute inset-0 grid place-items-center font-display text-lg font-medium text-white/70">{title.charAt(0)}</span>
      ) : variant === "poster" ? (
        // Title sits in the upper half so rank numbers / overlays at the bottom never collide with it.
        <div className="absolute inset-x-0 top-0 flex flex-col p-3 pt-12 sm:p-4 sm:pt-14">
          <span className="font-display text-[0.62rem] tracking-[0.3em] text-white/45">{year ?? ""}</span>
          <span className="mt-1 line-clamp-4 font-display text-[0.95rem] leading-tight font-medium text-white/90 sm:text-base">
            {title}
          </span>
        </div>
      ) : (
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-full items-center md:flex justify-end overflow-hidden pr-[4vw]">
          <span
            className="line-clamp-3 max-w-[70%] text-right font-display text-[clamp(4rem,11vw,11rem)] leading-[0.9] font-semibold tracking-tight text-transparent"
            style={{ WebkitTextStroke: `1px hsl(${h} 60% 70% / 0.18)` }}
          >
            {title}
          </span>
        </div>
      )}
      {label ? (
        <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[0.58rem] font-semibold tracking-wide text-white/70 backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export function PosterImage({
  id,
  title,
  year,
  path,
  size = "w342",
  sizes = "(min-width: 1280px) 220px, (min-width: 768px) 180px, 40vw",
  priority,
  demoLabel,
  thumb,
  className,
}: {
  id: number;
  title: string;
  year?: number | null;
  path: string | null;
  /** Small thumbnail: generated art shows only an initial. */
  thumb?: boolean;
  size?: PosterSize;
  sizes?: string;
  priority?: boolean;
  demoLabel?: string;
  className?: string;
}) {
  const src = tmdbImage(path, size);
  return (
    <div className={clsx("relative aspect-[2/3] overflow-hidden bg-surface-2", className)}>
      {src ? (
        <Image src={src} alt={title} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <GeneratedArt id={id} title={title} year={year} label={demoLabel} variant={thumb ? "thumb" : "poster"} />
      )}
    </div>
  );
}

export function BackdropImage({
  id,
  title,
  path,
  size = "w1280",
  priority,
  className,
}: {
  id: number;
  title: string;
  path: string | null;
  size?: BackdropSize;
  priority?: boolean;
  className?: string;
}) {
  const src = tmdbImage(path, size);
  return src ? (
    <Image src={src} alt="" fill sizes="100vw" priority={priority} className={clsx("object-cover", className)} />
  ) : (
    <GeneratedArt id={id} title={title} variant="backdrop" className={className} />
  );
}
