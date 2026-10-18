import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate: requests to private areas without a session cookie get a real 307
 * to the login page. This is only a fast path — every page and server action still verifies
 * the session (and admin role) against the database.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("kino_session")) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/library/:path*", "/profile/:path*"],
};
