"use client";

import { useActionState } from "react";
import { setRoleAction } from "@/app/actions/admin";
import { initialFormState } from "@/app/actions/types";
import { useI18n } from "../i18n-provider";
import { buttonClass } from "../ui";

export function RoleForm({ userId, role, isSelf }: { userId: string; role: "user" | "admin"; isSelf: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(setRoleAction, initialFormState);
  return (
    <form action={action} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role === "admin" ? "user" : "admin"} />
      <button type="submit" disabled={pending || (isSelf && role === "admin")} className={buttonClass("ghost", "sm")}>
        {role === "admin" ? t("admin.makeUser") : t("admin.makeAdmin")}
      </button>
      {state.error ? <span role="alert" className="text-xs text-danger">{t(state.error)}</span> : null}
    </form>
  );
}
