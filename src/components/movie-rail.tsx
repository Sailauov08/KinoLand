"use client";

import clsx from "clsx";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "./i18n-provider";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/** Horizontal, snap-scrolling row with edge arrows on pointer devices. */
export function MovieRail({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        onScroll={update}
        role="list"
        aria-label={label}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:-mx-10 lg:scroll-px-10 lg:px-10"
      >
        {Children.map(children, (child) => (
          <div
            role="listitem"
            className={clsx(
              "shrink-0 snap-start",
              wide ? "w-[78vw] sm:w-[360px] lg:w-[400px]" : "w-[38vw] sm:w-[180px] lg:w-[196px] xl:w-[210px]",
            )}
          >
            {child}
          </div>
        ))}
      </div>
      {(["start", "end"] as const).map((side) => (
        <button
          key={side}
          type="button"
          tabIndex={-1}
          aria-label={side === "start" ? t("common.scrollLeft") : t("common.scrollRight")}
          onClick={() => scroll(side === "start" ? -1 : 1)}
          className={clsx(
            "absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur-md transition duration-300 hover:bg-black/90 md:grid",
            side === "start" ? "-left-3 lg:left-1" : "-right-3 lg:right-1",
            edges[side] ? "pointer-events-none opacity-0" : "opacity-0 group-hover/rail:opacity-100",
          )}
        >
          {side === "start" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </button>
      ))}
    </div>
  );
}
