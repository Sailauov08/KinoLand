import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { overviewData } from "@/lib/admin/queries";
import { parseRange } from "@/lib/admin/range";

/** GET /api/admin/overview?range=30d — dashboard aggregates (admins only). */
export function GET(req: NextRequest) {
  const guard = requireAdminApi(req);
  if ("response" in guard) return guard.response;
  const d = overviewData(parseRange(req.nextUrl.searchParams.get("range")));
  return NextResponse.json(
    {
      range: d.range,
      users: d.users,
      pageViews: d.pageViews,
      visitorDays: d.visitorDays,
      movieViews: d.movieViews,
      searches: d.searches,
      watchlistInteractions: d.watchlistInteractions,
      popularMovies: d.popularMovies,
      errors24h: d.errors24h,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
