"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ClientEvent } from "@/lib/analytics/sanitize";
import { useI18n } from "./i18n-provider";
import { buttonClass } from "./ui";

const CONSENT_COOKIE = "kl_consent";
const ANON_ID_COOKIE = "kl_aid";

/** Fire-and-forget delivery to the first-party ingest endpoint. Never throws. */
export function sendEvent(event: ClientEvent) {
  try {
    const body = JSON.stringify(event);
    if (navigator.sendBeacon?.(new URL("/api/events", location.origin), new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}

/** Records one event when mounted (or when the event content changes). */
export function TrackEvent({ event }: { event: ClientEvent }) {
  const key = JSON.stringify(event);
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === key) return;
    sent.current = key;
    sendEvent(JSON.parse(key) as ClientEvent);
  }, [key]);
  return null;
}

function readCookie(name: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}

export function AnalyticsProvider({ posthogEnabled }: { posthogEnabled: boolean }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    sendEvent({ type: "page_view", path: pathname });
  }, [pathname]);

  return posthogEnabled ? <ConsentBanner /> : null;
}

/** Shown only when third-party analytics (PostHog) is configured. Nothing is sent to it before "Allow". */
function ConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reading a cookie is only possible after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!readCookie(CONSENT_COOKIE));
  }, []);

  const choose = (granted: boolean) => {
    const maxAge = 60 * 60 * 24 * 365;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${granted ? "granted" : "denied"}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    if (granted && !readCookie(ANON_ID_COOKIE)) {
      document.cookie = `${ANON_ID_COOKIE}=${crypto.randomUUID()}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    }
    if (!granted) document.cookie = `${ANON_ID_COOKIE}=; Max-Age=0; Path=/`;
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label={t("consent.title")} className="fixed inset-x-3 bottom-3 z-[65] mx-auto max-w-xl animate-fade-up rounded-2xl bg-surface-2/95 p-4 shadow-2xl ring-1 ring-line-strong backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
      <p className="text-sm font-semibold">{t("consent.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t("consent.text")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(true)} className={buttonClass("primary", "sm")}>
          {t("consent.allow")}
        </button>
        <button type="button" onClick={() => choose(false)} className={buttonClass("secondary", "sm")}>
          {t("consent.deny")}
        </button>
      </div>
    </div>
  );
}
