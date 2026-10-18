import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { RANGES, type RangeKey } from "@/lib/admin/range";
import type { AdminT } from "@/lib/i18n/admin";

export type Source = "db" | "events" | "posthog" | "tmdb";

const SOURCE_TONE: Record<Source, string> = {
  db: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
  events: "bg-accent/10 text-accent ring-accent/25",
  posthog: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
  tmdb: "bg-teal-400/10 text-teal-300 ring-teal-400/25",
};

export function SourceBadge({ source, at }: { source: Source; at: AdminT }) {
  return (
    <span className={clsx("inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[0.62rem] font-semibold tracking-wide ring-1 ring-inset", SOURCE_TONE[source])}>
      {at(`source.${source}`)}
    </span>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function Panel({
  title,
  source,
  hint,
  action,
  children,
  className,
  at,
}: {
  title: string;
  source?: Source;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  at: AdminT;
}) {
  return (
    <section className={clsx("min-w-0 rounded-2xl bg-surface p-5 ring-1 ring-line", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
        </div>
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          {action}
          {source ? <SourceBadge source={source} at={at} /> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, source, at, tone }: { label: string; value: ReactNode; hint?: string; source?: Source; at: AdminT; tone?: "default" | "warn" }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
        <p className="min-w-0 text-xs font-medium text-muted">{label}</p>
        {source ? <SourceBadge source={source} at={at} /> : null}
      </div>
      <p className={clsx("mt-2 font-display text-2xl font-medium tabular-nums sm:text-[1.7rem]", tone === "warn" ? "text-danger" : "text-fg")}>{value}</p>
      {hint ? <p className="mt-1 text-[0.7rem] leading-snug text-subtle">{hint}</p> : null}
    </div>
  );
}

export function RangeTabs({ range, basePath, at, extra }: { range: RangeKey; basePath: string; at: AdminT; extra?: Record<string, string> }) {
  return (
    <nav aria-label={at("range.label")} className="inline-flex w-fit rounded-xl bg-surface p-1 ring-1 ring-line">
      {RANGES.map((r) => {
        const qs = new URLSearchParams({ ...extra, range: r }).toString();
        return (
          <Link
            key={r}
            href={`${basePath}?${qs}`}
            aria-current={r === range ? "page" : undefined}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              r === range ? "bg-accent text-accent-ink" : "text-muted hover:bg-white/5 hover:text-fg",
            )}
          >
            {at(`range.${r}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusPill({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        ok === null ? "bg-white/5 text-muted ring-white/10" : ok ? "bg-success/10 text-success ring-success/25" : "bg-danger/10 text-danger ring-danger/25",
      )}
    >
      <span className={clsx("size-1.5 rounded-full", ok === null ? "bg-subtle" : ok ? "bg-success" : "bg-danger")} aria-hidden />
      {label}
    </span>
  );
}

export const tableCls = {
  wrap: "relative overflow-x-auto rounded-2xl ring-1 ring-line",
  table: "w-full text-left text-sm",
  thead: "bg-surface-2 text-[0.7rem] tracking-wide text-muted uppercase",
  th: "px-4 py-3 font-semibold whitespace-nowrap",
  tbody: "divide-y divide-line bg-surface",
  td: "px-4 py-3 align-middle",
};

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-subtle">{children}</p>;
}
