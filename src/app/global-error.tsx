"use client";

/** Last-resort boundary when the root layout itself fails (no providers available here). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0a09", color: "#f3eee6", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.2em", fontWeight: 700 }}>KINO</p>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Something went wrong · Что-то пошло не так · Бірдеңе дұрыс болмады</h1>
          <button
            onClick={reset}
            style={{ marginTop: 16, background: "#e8b44c", color: "#1b1407", border: 0, borderRadius: 999, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
