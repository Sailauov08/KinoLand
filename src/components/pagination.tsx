import clsx from "clsx";
import Link from "next/link";
import type { TFunction } from "@/lib/i18n/translate";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { buttonClass } from "./ui";

export function Pagination({
  page,
  totalPages,
  hrefFor,
  t,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  t: TFunction;
}) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? hrefFor(page - 1) : null;
  const next = page < totalPages ? hrefFor(page + 1) : null;
  const disabled = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-4">
      <Link href={prev ?? "#"} aria-disabled={!prev} tabIndex={prev ? undefined : -1} className={clsx(buttonClass("secondary", "md"), !prev && disabled)}>
        <ChevronLeftIcon size={18} /> {t("search.prev")}
      </Link>
      <p className="text-sm text-muted tabular-nums">{t("search.page", { page, total: totalPages })}</p>
      <Link href={next ?? "#"} aria-disabled={!next} tabIndex={next ? undefined : -1} className={clsx(buttonClass("secondary", "md"), !next && disabled)}>
        {t("search.next")} <ChevronRightIcon size={18} />
      </Link>
    </nav>
  );
}
