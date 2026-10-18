import type { ReactNode } from "react";

export function AuthShell({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-[520px] opacity-60"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 0%, rgba(232,180,76,0.18), transparent 70%), radial-gradient(500px 260px at 80% 30%, rgba(194,118,58,0.12), transparent 70%)",
        }}
      />
      <div className="container-page relative flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-md animate-fade-up rounded-[2rem] bg-surface/90 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-line backdrop-blur-xl sm:p-10">
          <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
          <p className="mt-2 mb-7 text-sm text-muted">{text}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
