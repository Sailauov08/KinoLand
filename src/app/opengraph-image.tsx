import { ImageResponse } from "next/og";

export const alt = "KinoLand — discover films worth your evening";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(900px 500px at 15% 0%, #3a2c17 0%, #0b0a09 70%)",
          color: "#f3eee6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 110, height: 110, borderRadius: 30, background: "#e8b44c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 32 32" width="84" height="84">
              <path d="M11 8.5h3v15h-3zM15.2 16 21 8.5h3.4l-5.9 7.5 5.9 7.5H21z" fill="#1b1407" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 96, letterSpacing: -2 }}>
            <span style={{ fontWeight: 700 }}>Kino</span>
            <span style={{ color: "#e8b44c", fontWeight: 400 }}>Land</span>
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 38, color: "#a8a196" }}>Discover films worth your evening</div>
      </div>
    ),
    size,
  );
}
