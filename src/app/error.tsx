"use client";

import { useEffect } from "react";
import { sendEvent } from "@/components/analytics";
import { useI18n } from "@/components/i18n-provider";
import { InfoIcon } from "@/components/icons";
import { Button, EmptyState, LinkButton } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
    sendEvent({ type: "client_error", path: location.pathname, props: { message: String(error.message || "Unknown error").slice(0, 500), digest: error.digest } });
  }, [error]);
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<InfoIcon size={26} />}
        title={t("common.error")}
        text={t("common.errorText")}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>{t("common.retry")}</Button>
            <LinkButton href="/" variant="secondary">
              {t("common.goHome")}
            </LinkButton>
          </div>
        }
      />
    </div>
  );
}
