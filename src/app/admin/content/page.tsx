import type { Metadata } from "next";
import Link from "next/link";
import { deleteBannerAction, deleteProviderLinkAction, unhideMovieAction } from "@/app/actions/admin";
import { BannerForm, ConfirmVoidForm, DisplaySettingsForm, HideMovieForm, ProviderForm } from "@/components/admin/forms";
import { AdminPageHeader, EmptyNote, Panel, StatusPill } from "@/components/admin/ui";
import { TrashIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth/session";
import { listBanners, listHiddenMovies, listProviderLinks, localized } from "@/lib/db/content";
import { getDisplaySettings } from "@/lib/db/settings";
import { localeTags } from "@/lib/i18n/config";
import { getAdminT } from "@/lib/i18n/server";
import { getMovieSummaries } from "@/lib/movies/service";

export async function generateMetadata(): Promise<Metadata> {
  const { at } = await getAdminT();
  return { title: at("content.title") };
}

export default async function AdminContentPage() {
  await requireAdmin("/admin/content");
  const { at, locale } = await getAdminT();
  const tag = localeTags[locale];
  const banners = listBanners();
  const hidden = listHiddenMovies();
  const providers = listProviderLinks();
  // Real TMDB titles for display (hidden films are fetched by id; failures fall back to the id).
  const ids = [...new Set([...banners.map((b) => b.movieId), ...providers.map((p) => p.movieId)])];
  const titles = await getMovieSummaries(ids, locale);
  const titleOf = (id: number) => (titles.ok ? titles.data.get(id)?.title : undefined) ?? `TMDB #${id}`;

  return (
    <>
      <AdminPageHeader title={at("content.title")} subtitle={at("content.subtitle")} />

      <Panel at={at} title={at("content.banners")} hint={at("content.bannersHint")}>
        <div className="space-y-4">
          {banners.length ? (
            banners.map((b) => (
              <details key={b.id} className="group rounded-xl bg-surface-2/50 ring-1 ring-line">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                  <StatusPill ok={b.isActive} label={b.isActive ? at("content.active") : "—"} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {titleOf(b.movieId)}
                    {localized(b.description, locale) ? <span className="ml-2 font-normal text-muted">“{localized(b.description, locale)}”</span> : null}
                  </span>
                  <span className="text-xs text-subtle">#{b.position}</span>
                  <ConfirmVoidForm action={deleteBannerAction} fields={{ id: String(b.id) }} label={at("content.delete")} confirmText={at("content.deleteBannerConfirm")} icon={<TrashIcon size={16} />} />
                </summary>
                <div className="border-t border-line p-4">
                  <BannerForm initial={b} />
                </div>
              </details>
            ))
          ) : (
            <EmptyNote>{at("content.noBanners")}</EmptyNote>
          )}
          <details className="rounded-xl ring-1 ring-dashed ring-line-strong">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-accent">+ {at("content.newBanner")}</summary>
            <div className="border-t border-line p-4">
              <BannerForm />
            </div>
          </details>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel at={at} title={at("content.hidden")} hint={at("content.hiddenHint")}>
          <HideMovieForm />
          <div className="mt-4">
            {hidden.length ? (
              <ul className="divide-y divide-line">
                {hidden.map((h) => (
                  <li key={h.movieId} className="flex items-center gap-3 py-2 text-sm">
                    <span className="font-mono text-xs text-muted">TMDB #{h.movieId}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-subtle">{h.reason ?? ""}</span>
                    <span className="text-[0.7rem] text-subtle">{new Date(h.createdAt).toLocaleDateString(tag)}</span>
                    <form action={unhideMovieAction}>
                      <input type="hidden" name="movieId" value={h.movieId} />
                      <button type="submit" className="rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10">
                        {at("content.unhide")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>{at("content.noHidden")}</EmptyNote>
            )}
          </div>
        </Panel>

        <Panel at={at} title={at("content.display")}>
          <DisplaySettingsForm values={getDisplaySettings()} />
        </Panel>
      </div>

      <Panel at={at} className="mt-4" title={at("content.providers")} hint={at("content.providersHint")}>
        <ProviderForm />
        <div className="mt-4">
          {providers.length ? (
            <ul className="divide-y divide-line">
              {providers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <Link href={`/movie/${p.movieId}`} className="font-semibold hover:text-accent">
                    {titleOf(p.movieId)}
                  </Link>
                  <span className="text-muted">{p.provider}</span>
                  {p.region ? <span className="rounded bg-white/8 px-1.5 text-[0.65rem] font-bold">{p.region}</span> : null}
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-subtle">{new URL(p.url).hostname}</span>
                  <ConfirmVoidForm action={deleteProviderLinkAction} fields={{ id: String(p.id) }} label={at("content.delete")} confirmText={at("content.removeConfirm")} icon={<TrashIcon size={16} />} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>{at("content.noProviders")}</EmptyNote>
          )}
        </div>
      </Panel>
    </>
  );
}
