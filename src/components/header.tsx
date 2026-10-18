"use client";

import clsx from "clsx";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { setLocaleAction } from "@/app/actions/profile";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "./i18n-provider";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  GlobeIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon,
} from "./icons";
import { buttonClass } from "./ui";

export interface HeaderUser {
  name: string;
  role: "user" | "admin";
}

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/top", key: "nav.top" },
  { href: "/search", key: "nav.search" },
  { href: "/collections", key: "nav.collections" },
  { href: "/for-you", key: "nav.forYou" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function Header({ user }: { user: HeaderUser | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer whenever the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled || mobileOpen
          ? "bg-ink/85 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
          : "bg-gradient-to-b from-black/70 to-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center gap-3 lg:gap-8">
        <Link href="/" className="group flex items-center gap-2 rounded-md" aria-label="KINO">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink transition group-hover:rotate-[-6deg]">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M4 5h3v14H4zM9.5 12 17 5h3.5l-7.6 7 7.6 7H17z" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-[0.18em]">KINO</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={clsx(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition",
                    isActive(pathname, item.href) ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {t(item.key)}
                  {isActive(pathname, item.href) ? (
                    <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-accent" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Form action="/search" className="relative hidden md:block" role="search">
            <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" />
            <input
              name="q"
              type="search"
              placeholder={t("nav.quickSearch")}
              aria-label={t("nav.search")}
              className="h-10 w-44 rounded-full bg-white/8 pr-4 pl-10 text-sm text-fg ring-1 ring-white/10 transition-[width,background-color] duration-300 placeholder:text-subtle focus:w-64 focus:bg-white/12 focus:ring-accent/60 focus:outline-none xl:w-56"
            />
          </Form>
          <Link href="/search" className={buttonClass("ghost", "icon", "md:hidden")} aria-label={t("nav.search")}>
            <SearchIcon />
          </Link>
          <LocaleSwitcher />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={clsx(buttonClass("primary", "sm"), "hidden sm:inline-flex")}>
              {t("nav.signIn")}
            </Link>
          )}
          <button
            type="button"
            className={buttonClass("ghost", "icon", "lg:hidden")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? t("nav.close") : t("nav.menu")}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-nav" className="animate-fade-up h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-ink/95 backdrop-blur-xl lg:hidden">
          <nav aria-label="Mobile" className="container-page py-6">
            <ul className="space-y-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={clsx(
                      "block rounded-2xl px-4 py-3.5 font-display text-lg",
                      isActive(pathname, item.href) ? "bg-white/8 text-fg" : "text-muted hover:bg-white/5 hover:text-fg",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ))}
              {user ? (
                <li>
                  <Link href="/library" className="block rounded-2xl px-4 py-3.5 font-display text-lg text-muted hover:bg-white/5 hover:text-fg">
                    {t("nav.library")}
                  </Link>
                </li>
              ) : null}
            </ul>
            {!user ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link href="/login" className={buttonClass("secondary", "lg")}>
                  {t("nav.signIn")}
                </Link>
                <Link href="/register" className={buttonClass("primary", "lg")}>
                  {t("nav.signUp")}
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function LocaleSwitcher() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useDismiss(open, () => setOpen(false));

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.language")}
        className={buttonClass("ghost", "sm", pending ? "opacity-60" : undefined)}
      >
        <GlobeIcon size={18} />
        <span className="hidden text-xs font-bold tracking-wider uppercase sm:inline">{locale}</span>
      </button>
      {open ? (
        <ul role="menu" aria-label={t("nav.language")} className="animate-fade-up absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl bg-surface-2 p-1.5 shadow-2xl ring-1 ring-line-strong">
          {locales.map((l) => (
            <li key={l} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l === locale}
                lang={l}
                onClick={() => choose(l)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-fg hover:bg-white/8"
              >
                {localeNames[l]}
                {l === locale ? <CheckIcon size={16} className="text-accent" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function UserMenu({ user }: { user: HeaderUser }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const ref = useDismiss(open, () => setOpen(false));
  const initial = user.name.trim().charAt(0).toUpperCase() || "K";

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg hover:bg-white/8";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("nav.account")}
        className="flex items-center gap-1.5 rounded-full p-1 ring-1 ring-white/10 transition hover:bg-white/8 sm:pr-2"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent to-[#c2763a] font-display text-sm font-semibold text-accent-ink">
          {initial}
        </span>
        <ChevronDownIcon size={14} className="hidden text-muted sm:block" />
      </button>
      {open ? (
        <div role="menu" className="animate-fade-up absolute right-0 mt-2 w-60 rounded-2xl bg-surface-2 p-1.5 shadow-2xl ring-1 ring-line-strong">
          <p className="truncate px-3 pt-2 pb-2.5 text-sm font-semibold">{user.name}</p>
          <div className="mb-1 h-px bg-line" />
          <Link role="menuitem" href="/profile" className={item}>
            <UserIcon size={17} className="text-muted" /> {t("nav.profile")}
          </Link>
          <Link role="menuitem" href="/library" className={item}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted" aria-hidden>
              <path d="M6 3h12v18l-6-4-6 4Z" />
            </svg>
            {t("nav.library")}
          </Link>
          {user.role === "admin" ? (
            <Link role="menuitem" href="/admin" className={item}>
              <ShieldIcon size={17} className="text-muted" /> {t("nav.admin")}
            </Link>
          ) : null}
          <div className="my-1 h-px bg-line" />
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className={clsx(item, "text-danger")}>
              <LogOutIcon size={17} /> {t("nav.signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
