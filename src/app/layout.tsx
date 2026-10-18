import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics";
import { Footer } from "@/components/footer";
import { SiteChrome } from "@/components/site-chrome";
import { isPosthogConfigured } from "@/lib/env";
import { Header } from "@/components/header";
import { I18nProvider } from "@/components/i18n-provider";
import { ListStateProvider } from "@/components/list-state";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllMemberIds } from "@/lib/db/lists";
import { getT } from "@/lib/i18n/server";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: `KinoLand — ${t("meta.tagline")}`, template: "%s · KinoLand" },
    description: t("meta.description"),
    applicationName: "KinoLand",
    openGraph: { siteName: "KinoLand", type: "website", title: `KinoLand — ${t("meta.tagline")}`, description: t("meta.description") },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ locale, t, dict }, user] = await Promise.all([getT(), getCurrentUser()]);
  const members = user ? await getAllMemberIds(user.id) : { watchlist: [], favorite: [] };

  return (
    <html lang={locale} className={`${manrope.variable} ${unbounded.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <ListStateProvider signedIn={!!user} watchlist={members.watchlist} favorite={members.favorite}>
            <a
              href="#main"
              className="sr-only z-[70] rounded-full bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              {t("nav.skip")}
            </a>
            <SiteChrome>
              <Header user={user ? { name: user.name, role: user.role } : null} />
            </SiteChrome>
            <main id="main" className="w-full min-w-0 flex-1">
              {children}
            </main>
            <SiteChrome>
              <Footer t={t} />
            </SiteChrome>
            <AnalyticsProvider posthogEnabled={isPosthogConfigured()} />
          </ListStateProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
