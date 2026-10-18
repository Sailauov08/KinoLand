import { describe, expect, it } from "vitest";
import { tmdbImage } from "@/lib/movies/images";
import tmdbImageLoader, { tmdbSizeFor } from "@/lib/movies/tmdb-image-loader";

describe("TMDB image URLs", () => {
  it("builds CDN URLs and rejects missing or malformed paths", () => {
    expect(tmdbImage("/abc123.jpg")).toBe("https://image.tmdb.org/t/p/original/abc123.jpg");
    expect(tmdbImage("/abc123.jpg", "w1280")).toBe("https://image.tmdb.org/t/p/w1280/abc123.jpg");
    expect(tmdbImage(null)).toBeNull();
    expect(tmdbImage("")).toBeNull();
    expect(tmdbImage("https://evil.example/x.jpg")).toBeNull();
    expect(tmdbImage("/../x.jpg")).toBeNull();
  });

  it("maps srcset widths up to the nearest TMDB size", () => {
    expect(tmdbSizeFor(16)).toBe("w92");
    expect(tmdbSizeFor(186)).toBe("w300");
    expect(tmdbSizeFor(640)).toBe("w780");
    expect(tmdbSizeFor(1280)).toBe("w1280");
    expect(tmdbSizeFor(1920)).toBe("original");
  });

  it("rewrites only TMDB URLs in the next/image loader", () => {
    expect(tmdbImageLoader({ src: "https://image.tmdb.org/t/p/original/abc.jpg", width: 384 })).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
    expect(tmdbImageLoader({ src: "https://image.tmdb.org/t/p/original/abc.jpg", width: 400 })).not.toBe("https://image.tmdb.org/t/p/original/abc.jpg");
    expect(tmdbImageLoader({ src: "https://image.tmdb.org/t/p/w1280/bd.jpg", width: 3840 })).toBe("https://image.tmdb.org/t/p/original/bd.jpg");
    expect(tmdbImageLoader({ src: "https://i.ytimg.com/vi/x/hqdefault.jpg", width: 640 })).toBe("https://i.ytimg.com/vi/x/hqdefault.jpg");
  });
});
