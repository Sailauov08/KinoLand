import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Admin server actions must refuse anyone who is not a database-verified admin — even when called
 * directly (server actions are public HTTP endpoints). The session layer is mocked per test.
 */
const session = vi.hoisted(() => ({ current: null as null | { id: string; role: "user" | "admin"; status: "active" } }));
const users = vi.hoisted(() => ({
  setUserRole: vi.fn(),
  setUserStatus: vi.fn(),
  findUserById: vi.fn(),
  countActiveAdmins: vi.fn(() => 1),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => session.current, revokeAllSessions: vi.fn(() => 0) }));
vi.mock("@/lib/db/users", () => users);
vi.mock("@/lib/db/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/db/content", () => ({
  deleteBanner: vi.fn(),
  deleteProviderLink: vi.fn(),
  getBanner: vi.fn(),
  hideMovie: vi.fn(),
  saveBanner: vi.fn(),
  unhideMovie: vi.fn(),
  upsertProviderLink: vi.fn(),
}));
vi.mock("@/lib/db/events", () => ({ deleteEventsBefore: vi.fn(() => 0) }));
vi.mock("@/lib/db/settings", async () => {
  const { z } = await import("zod");
  return { displaySettingsSchema: z.object({ showTrending: z.boolean() }), setDisplaySettings: vi.fn(), setRetentionDays: vi.fn() };
});
vi.mock("@/lib/movies/service", () => ({ getMovie: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = null;
  });

  it("reject unauthenticated callers", async () => {
    const actions = await import("@/app/actions/admin");
    await expect(actions.setUserRoleAction({}, fd({ userId: OTHER, role: "admin" }))).rejects.toThrow("Forbidden");
    await expect(actions.purgeEventsAction({}, fd({ days: "30" }))).rejects.toThrow("Forbidden");
    expect(users.setUserRole).not.toHaveBeenCalled();
  });

  it("reject regular users, including self-promotion attempts", async () => {
    session.current = { id: OTHER, role: "user", status: "active" };
    const actions = await import("@/app/actions/admin");
    await expect(actions.setUserRoleAction({}, fd({ userId: OTHER, role: "admin" }))).rejects.toThrow("Forbidden");
    await expect(actions.deleteBannerAction(fd({ id: "1" }))).rejects.toThrow("Forbidden");
    await expect(actions.hideMovieAction({}, fd({ movieId: "550" }))).rejects.toThrow("Forbidden");
    expect(users.setUserRole).not.toHaveBeenCalled();
  });

  it("prevent admins from locking themselves out", async () => {
    session.current = { id: ADMIN, role: "admin", status: "active" };
    const actions = await import("@/app/actions/admin");
    expect(await actions.setUserRoleAction({}, fd({ userId: ADMIN, role: "user" }))).toEqual({ error: "action.self" });
    expect(await actions.setUserStatusAction({}, fd({ userId: ADMIN, status: "suspended" }))).toEqual({ error: "action.self" });
  });

  it("protect the last active administrator", async () => {
    session.current = { id: ADMIN, role: "admin", status: "active" };
    users.findUserById.mockReturnValue({ id: OTHER, role: "admin", status: "active" });
    users.countActiveAdmins.mockReturnValue(1);
    const actions = await import("@/app/actions/admin");
    expect(await actions.setUserRoleAction({}, fd({ userId: OTHER, role: "user" }))).toEqual({ error: "action.lastAdmin" });
    expect(await actions.setUserStatusAction({}, fd({ userId: OTHER, status: "suspended" }))).toEqual({ error: "action.lastAdmin" });
    expect(users.setUserRole).not.toHaveBeenCalled();
    expect(users.setUserStatus).not.toHaveBeenCalled();
  });

  it("allow a valid admin action and validate input", async () => {
    session.current = { id: ADMIN, role: "admin", status: "active" };
    users.findUserById.mockReturnValue({ id: OTHER, role: "user", status: "active" });
    const actions = await import("@/app/actions/admin");
    expect(await actions.setUserRoleAction({}, fd({ userId: "not-a-uuid", role: "admin" }))).toEqual({ error: "action.invalid" });
    expect(await actions.setUserRoleAction({}, fd({ userId: OTHER, role: "admin" }))).toEqual({ ok: true, message: "action.saved" });
    expect(users.setUserRole).toHaveBeenCalledWith(OTHER, "admin");
  });

  it("only accept public https provider URLs", async () => {
    session.current = { id: ADMIN, role: "admin", status: "active" };
    const actions = await import("@/app/actions/admin");
    for (const url of ["http://example.com/x", "https://localhost/x", "https://127.0.0.1/x", "javascript:alert(1)", "https://user:pass@example.com/"]) {
      const res = await actions.addProviderLinkAction({}, fd({ movieId: "27205", provider: "Test", url, region: "" }));
      expect(res.error, url).toBe("action.invalid");
    }
  });
});
