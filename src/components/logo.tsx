import clsx from "clsx";

/** KinoLand brand mark: a film-frame "K" tile + two-weight wordmark. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={className}>
      <rect width="32" height="32" rx="9" fill="#e8b44c" />
      <path d="M6 9h2M6 16h2M6 23h2M24 9h2M24 16h2M24 23h2" stroke="#1b1407" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 8.5h3v15h-3zM15.2 16 21 8.5h3.4l-5.9 7.5 5.9 7.5H21z" fill="#1b1407" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("font-display text-[1.15rem] leading-none tracking-[-0.01em]", className)}>
      <span className="font-semibold text-fg">Kino</span>
      <span className="font-normal text-accent">Land</span>
    </span>
  );
}

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={compact ? 26 : 32} className="shrink-0 transition duration-300 group-hover:rotate-[-6deg]" />
      <Wordmark className={compact ? "text-base" : undefined} />
    </span>
  );
}
