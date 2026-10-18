import { describe, expect, it } from "vitest";
import { matchAcceptLanguage } from "@/lib/i18n/config";
import { createTranslator, dictionaries, interpolate } from "@/lib/i18n/translate";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  const enKeys = Object.keys(dictionaries.en).sort();

  for (const locale of ["ru", "kk"] as const) {
    it(`${locale} has exactly the English keys, non-empty, with the same placeholders`, () => {
      const dict = dictionaries[locale];
      expect(Object.keys(dict).sort()).toEqual(enKeys);
      for (const key of enKeys as (keyof typeof dict)[]) {
        expect(dict[key].trim(), key).not.toBe("");
        expect(placeholders(dict[key]), key).toEqual(placeholders(dictionaries.en[key]));
      }
    });
  }
});

describe("translator", () => {
  it("interpolates variables and leaves unknown ones intact", () => {
    expect(interpolate("{a} of {b} {c}", { a: 1, b: "two" })).toBe("1 of two {c}");
  });
  it("translates with variables", () => {
    expect(createTranslator(dictionaries.ru)("list.count", { n: 3 })).toBe("Фильмов: 3");
  });
});

describe("matchAcceptLanguage", () => {
  it("picks the best supported language by quality", () => {
    expect(matchAcceptLanguage("de-DE,kk;q=0.9,ru;q=0.8")).toBe("kk");
    expect(matchAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(matchAcceptLanguage("fr-FR")).toBe("en");
    expect(matchAcceptLanguage(null)).toBe("en");
  });
});

describe("admin dictionaries", () => {
  it("ru and kk match the English admin keys and placeholders", async () => {
    const { adminDictionaries } = await import("@/lib/i18n/admin");
    const enKeys = Object.keys(adminDictionaries.en).sort();
    for (const locale of ["ru", "kk"] as const) {
      const dict = adminDictionaries[locale];
      expect(Object.keys(dict).sort()).toEqual(enKeys);
      for (const key of enKeys as (keyof typeof dict)[]) {
        expect(dict[key].trim(), `${locale}:${key}`).not.toBe("");
        expect(placeholders(dict[key]), `${locale}:${key}`).toEqual(placeholders(adminDictionaries.en[key]));
      }
    }
  });
});
