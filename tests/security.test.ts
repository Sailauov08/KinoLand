import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { collectionSchema, registerSchema } from "@/lib/validation";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("salts every hash and rejects malformed hashes", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  });

  it("creates unguessable session tokens and stores only their hash", () => {
    const a = newSessionToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(a).not.toBe(newSessionToken());
    expect(hashToken(a)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("rateLimit", () => {
  it("blocks after the limit within the window and resets after it", () => {
    const key = `test:${Math.random()}`;
    expect([1, 2, 3].map(() => rateLimit(key, 2, 1000, 0))).toEqual([true, true, false]);
    expect(rateLimit(key, 2, 1000, 1001)).toBe(true);
  });
});

describe("validation", () => {
  it("normalizes emails and enforces password length", () => {
    expect(registerSchema.parse({ name: " Ana ", email: " Ana@Example.COM ", password: "12345678" })).toEqual({
      name: "Ana",
      email: "ana@example.com",
      password: "12345678",
    });
    expect(registerSchema.safeParse({ name: "A", email: "a@b.co", password: "short" }).success).toBe(false);
  });

  it("accepts only safe collection slugs", () => {
    const base = { title: { en: "T" }, description: { en: "" }, isPublished: true, isFeatured: false, position: 0 };
    expect(collectionSchema.safeParse({ ...base, slug: "soviet-classics" }).success).toBe(true);
    for (const slug of ["Bad Slug", "../etc", "-x", "a--b"]) {
      expect(collectionSchema.safeParse({ ...base, slug }).success, slug).toBe(false);
    }
  });
});
