import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition duration-200 ease-[var(--ease-cinema)] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_8px_30px_-12px_rgba(232,180,76,0.6)]",
  secondary: "bg-white/10 text-fg hover:bg-white/16 ring-1 ring-inset ring-white/12 backdrop-blur-md",
  ghost: "text-muted hover:text-fg hover:bg-white/6",
  danger: "bg-danger/12 text-danger ring-1 ring-inset ring-danger/30 hover:bg-danger/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
  // Icon-only buttons get their own sizes: overriding px-* afterwards is unreliable in Tailwind's cascade.
  "icon-sm": "size-9",
  icon: "size-10",
  "icon-lg": "size-12",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function SectionHeader({
  title,
  eyebrow,
  action,
  id,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 id={id} className="font-display text-lg font-medium tracking-tight text-fg sm:text-xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, eyebrow, children }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <header className="animate-fade-up pt-10 pb-8 sm:pt-14 sm:pb-10">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
      {subtitle ? <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-muted sm:text-base">{subtitle}</p> : null}
      {children}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center">
      {icon ? <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/5 text-accent">{icon}</div> : null}
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {text ? <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "success"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide",
        tone === "accent" && "bg-accent/15 text-accent ring-1 ring-inset ring-accent/30",
        tone === "success" && "bg-success/12 text-success ring-1 ring-inset ring-success/25",
        tone === "neutral" && "bg-white/8 text-muted ring-1 ring-inset ring-white/10",
        className,
      )}
    >
      {children}
    </span>
  );
}
