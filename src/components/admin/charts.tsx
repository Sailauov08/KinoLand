/**
 * Dependency-free SVG charts for the admin dashboard. Server-rendered, theme-matched, with an
 * accessible text summary (and native <title> tooltips on data points).
 */
import clsx from "clsx";
import { useId } from "react";

export interface Series {
  label: string;
  color: string;
  points: { day: string; value: number }[];
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

const shortDay = (day: string, locale: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });

/**
 * Responsive time series. The plot is an SVG stretched to its box (non-scaling strokes), while
 * axis labels are HTML so they stay legible at any width — from phones to wide monitors.
 */
export function TimeSeriesChart({ series, locale, label, height = 180 }: { series: Series[]; locale: string; label: string; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const days = series[0]?.points.map((p) => p.day) ?? [];
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value))));
  const x = (i: number) => (days.length <= 1 ? 50 : (i / (days.length - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));
  const totals = series.map((s) => `${s.label}: ${s.points.reduce((a, p) => a + p.value, 0)}`).join(", ");
  const fmtTick = (tk: number) => (Number.isInteger(tk) ? tk.toLocaleString(locale) : tk.toFixed(1));

  return (
    <figure className="w-full" aria-label={`${label}. ${totals}`} role="img">
      <div className="flex gap-2">
        <div className="flex w-8 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-subtle tabular-nums" style={{ height }} aria-hidden>
          {ticks.map((tk) => (
            <span key={tk} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {fmtTick(tk)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            {ticks.map((tk) => (
              <line key={tk} x1={0} x2={100} y1={y(tk)} y2={y(tk)} stroke="rgb(255 255 255 / 0.07)" strokeDasharray={tk ? "3 4" : undefined} vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s, si) => {
              const line = s.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(" ");
              const area = `${line} L${x(s.points.length - 1).toFixed(2)},100 L${x(0).toFixed(2)},100 Z`;
              const gradId = `g${uid}-${si}`;
              return (
                <g key={s.label}>
                  <defs>
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={si === 0 ? 0.28 : 0.12} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#${gradId})`} />
                  <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
            {/* Invisible per-day hover targets with native tooltips */}
            {days.map((d, i) => (
              <rect key={d} x={x(i) - 50 / Math.max(days.length - 1, 1)} y={0} width={100 / Math.max(days.length - 1, 1)} height={100} fill="transparent">
                <title>{`${shortDay(d, locale)} — ${series.map((s) => `${s.label}: ${s.points[i]?.value ?? 0}`).join(", ")}`}</title>
              </rect>
            ))}
          </svg>
        </div>
      </div>
      <div className="relative mt-1.5 ml-10 h-4 text-[10px] text-subtle" aria-hidden>
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <span
              key={d}
              className="absolute whitespace-nowrap"
              style={{ left: `${x(i)}%`, transform: i === 0 ? "none" : i === days.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {shortDay(d, locale)}
            </span>
          ) : null,
        )}
      </div>
      {series.length > 1 ? (
        <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Ranked horizontal bars — readable on mobile, good for top-N lists. */
export function BarList({
  items,
  color = "var(--color-accent)",
  emptyLabel,
  valueSuffix,
}: {
  items: { label: React.ReactNode; value: number; href?: string; key: string | number }[];
  color?: string;
  emptyLabel: string;
  valueSuffix?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-subtle">{emptyLabel}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="space-y-1.5">
      {items.map((item) => {
        const inner = (
          <>
            <span className="absolute inset-y-0 left-0 rounded-lg opacity-20" style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: color }} aria-hidden />
            <span className="relative min-w-0 truncate">{item.label}</span>
            <span className="relative shrink-0 font-semibold tabular-nums text-fg">
              {item.value.toLocaleString()}
              {valueSuffix}
            </span>
          </>
        );
        const cls = "relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm";
        return (
          <li key={item.key}>
            {item.href ? (
              <a href={item.href} className={clsx(cls, "transition hover:bg-white/5")}>
                {inner}
              </a>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Two-part proportion bar (e.g. available vs unavailable). */
export function SplitBar({ a, b, labelA, labelB, colorA = "var(--color-success)", colorB = "var(--color-danger)" }: { a: number; b: number; labelA: string; labelB: string; colorA?: string; colorB?: string }) {
  const total = a + b;
  const pa = total ? Math.round((a / total) * 100) : 0;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${labelA}: ${a}, ${labelB}: ${b}`}>
        {total ? (
          <>
            <span style={{ width: `${pa}%`, background: colorA }} />
            <span style={{ width: `${100 - pa}%`, background: colorB }} />
          </>
        ) : null}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>
          <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: colorA }} aria-hidden />
          {labelA}: <b className="text-fg tabular-nums">{a}</b> {total ? `(${pa}%)` : ""}
        </span>
        <span>
          <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: colorB }} aria-hidden />
          {labelB}: <b className="text-fg tabular-nums">{b}</b> {total ? `(${100 - pa}%)` : ""}
        </span>
      </div>
    </div>
  );
}
