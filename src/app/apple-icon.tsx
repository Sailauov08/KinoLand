import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8b44c" }}>
        <svg viewBox="0 0 32 32" width="132" height="132">
          <path d="M11 8.5h3v15h-3zM15.2 16 21 8.5h3.4l-5.9 7.5 5.9 7.5H21z" fill="#1b1407" />
        </svg>
      </div>
    ),
    size,
  );
}
