import type { Metadata } from "next";
import { PasswordForm, ProfileForm } from "@/components/profile-forms";
import { Badge, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getList } from "@/lib/db/lists";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { genreOptions } from "@/lib/movies/genres";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("profile.title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const { locale, t } = await getT();
  const stats = [
    { label: t("list.watchlist"), value: (await getList(user.id, "watchlist")).length },
    { label: t("list.favorites"), value: (await getList(user.id, "favorite")).length },
    { label: t("profile.genres"), value: user.preferredGenres.length },
  ];

  return (
    <div className="container-page">
      <PageHeader title={user.name} eyebrow={t("profile.title")} subtitle={`${user.email} · ${t("profile.memberSince", { date: formatDate(user.createdAt, locale) })}`}>
        <div className="mt-4">
          <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{t(user.role === "admin" ? "profile.role.admin" : "profile.role.user")}</Badge>
        </div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="details" className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
          <h2 id="details" className="mb-6 font-display text-lg font-medium">{t("profile.details")}</h2>
          <ProfileForm
            name={user.name}
            locale={user.locale ?? locale}
            selected={user.preferredGenres}
            genres={genreOptions(locale).map((g) => ({ value: g.id, label: g.name }))}
          />
        </section>

        <div className="space-y-8">
          <section aria-labelledby="stats" className="rounded-3xl bg-surface p-6 ring-1 ring-line">
            <h2 id="stats" className="mb-4 font-display text-base font-medium">{t("profile.stats")}</h2>
            <dl className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-surface-2 p-3 text-center">
                  <dd className="font-display text-2xl text-accent">{s.value}</dd>
                  <dt className="mt-1 text-[0.7rem] leading-tight text-muted">{s.label}</dt>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="password" className="rounded-3xl bg-surface p-6 ring-1 ring-line">
            <h2 id="password" className="mb-5 font-display text-base font-medium">{t("profile.password")}</h2>
            <PasswordForm />
          </section>
        </div>
      </div>
    </div>
  );
}
