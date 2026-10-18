import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.signIn"), robots: { index: false } };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const { t } = await getT();
  return (
    <AuthShell title={t("auth.signInTitle")} text={t("auth.signInText")}>
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
