import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { listUsersPaged, USER_SORTS } from "@/lib/db/users";

const query = z.object({
  q: z.string().trim().max(100).catch(""),
  role: z.enum(["user", "admin"]).nullable().catch(null),
  status: z.enum(["active", "suspended"]).nullable().catch(null),
  sort: z.enum(USER_SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  perPage: z.coerce.number().int().min(1).max(100).catch(20),
});

/** GET /api/admin/users — paginated accounts with safe fields only (no hashes, no tokens). */
export async function GET(req: NextRequest) {
  const guard = await requireAdminApi(req);
  if ("response" in guard) return guard.response;
  const sp = req.nextUrl.searchParams;
  const f = query.parse({ q: sp.get("q") ?? "", role: sp.get("role"), status: sp.get("status"), sort: sp.get("sort"), page: sp.get("page"), perPage: sp.get("perPage") });
  const res = await listUsersPaged({ query: f.q, role: f.role, status: f.status, sort: f.sort, page: f.page, perPage: f.perPage });
  return NextResponse.json(
    {
      ...res,
      items: res.items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt,
        watchlistCount: u.watchlistCount,
        favoriteCount: u.favoriteCount,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
