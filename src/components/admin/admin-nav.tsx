"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "../i18n-provider";

export function AdminNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: t("admin.collections"), active: pathname === "/admin" || pathname.startsWith("/admin/collections") },
    { href: "/admin/users", label: t("admin.users"), active: pathname.startsWith("/admin/users") },
  ];
  return (
    <nav aria-label={t("admin.title")} className="flex gap-2 border-b border-line">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={clsx(
            "-mb-px border-b-2 px-4 pb-3 text-sm font-semibold transition",
            i.active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
