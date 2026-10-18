"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createAdminTranslator, type AdminDictionary, type AdminT } from "@/lib/i18n/admin";

const Ctx = createContext<AdminT | null>(null);

export function AdminI18nProvider({ dict, children }: { dict: AdminDictionary; children: ReactNode }) {
  const at = useMemo(() => createAdminTranslator(dict), [dict]);
  return <Ctx value={at}>{children}</Ctx>;
}

export function useAdminT(): AdminT {
  const at = useContext(Ctx);
  if (!at) throw new Error("useAdminT must be used within AdminI18nProvider");
  return at;
}
