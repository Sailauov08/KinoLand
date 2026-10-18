"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { AdminKey } from "@/lib/i18n/admin";
import { ArrowLeftIcon, CloseIcon, LogOutIcon, MenuIcon } from "../icons";
import { LogoMark, Wordmark } from "../logo";
import { useAdminT } from "./admin-i18n";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...P}>
    {d}
  </svg>
);

const NAV: { href: string; key: AdminKey; icon: ReactNode }[] = [
  { href: "/admin", key: "nav.overview", icon: <I d={<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>} /> },
  { href: "/admin/users", key: "nav.users", icon: <I d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.9-3.4 3.4-5.2 6.5-5.2s5.6 1.8 6.5 5.2M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.9c1.8.6 3 2.3 3.5 5.1" /></>} /> },
  { href: "/admin/analytics", key: "nav.analytics", icon: <I d={<path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7" />} /> },
  { href: "/admin/movies", key: "nav.movies", icon: <I d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>} /> },
  { href: "/admin/search", key: "nav.search", icon: <I d={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>} /> },
  { href: "/admin/watchlists", key: "nav.watchlists", icon: <I d={<path d="M6 3h12v18l-6-4-6 4Z" />} /> },
  { href: "/admin/content", key: "nav.content", icon: <I d={<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M9 9h6M9 12h3" /></>} /> },
  { href: "/admin/health", key: "nav.health", icon: <I d={<path d="M3 12h4l3-7 4 14 3-7h4" />} /> },
  { href: "/admin/settings", key: "nav.settings", icon: <I d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>} /> },
];

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

export function AdminShell({ userName, children }: { userName: string; children: ReactNode }) {
  const at = useAdminT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = (
    <nav aria-label={at("menu")} className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-accent/12 text-accent-strong ring-1 ring-accent/20" : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                {item.icon}
                {at(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <p className="truncate px-3 pb-2 text-xs text-subtle">{at("signedInAs", { name: userName })}</p>
      <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-fg">
        <ArrowLeftIcon size={17} /> {at("backToSite")}
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-danger/90 transition hover:bg-danger/10">
          <LogOutIcon size={17} /> {at("signOut")}
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-md">
      <LogoMark size={28} />
      <Wordmark className="text-base" />
      <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-widest text-muted uppercase">{at("brandSuffix")}</span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink/90 px-4 backdrop-blur-xl lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={at("menu")}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="grid size-10 place-items-center rounded-xl text-muted hover:bg-white/5 hover:text-fg"
        >
          <MenuIcon />
        </button>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={at("menu")}>
          <button type="button" aria-label={at("close")} className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside id="admin-drawer" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-up flex-col bg-surface ring-1 ring-line">
            <div className="flex h-14 items-center justify-between px-4">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label={at("close")} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-white/5">
                <CloseIcon />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
    </div>
  );
}
