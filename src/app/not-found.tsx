import { FilmIcon } from "@/components/icons";
import { EmptyState, LinkButton } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<FilmIcon size={26} />}
        title={t("common.notFound")}
        text={t("common.notFoundText")}
        action={<LinkButton href="/">{t("common.goHome")}</LinkButton>}
      />
    </div>
  );
}
