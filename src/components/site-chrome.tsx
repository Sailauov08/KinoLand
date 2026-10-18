"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Public-site chrome (footer etc.) is hidden inside the admin dashboard, which has its own shell. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
