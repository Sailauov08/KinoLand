"use client";

import { sendEvent } from "./analytics";
import { ExternalIcon } from "./icons";
import { buttonClass } from "./ui";

/** Outbound link to an admin-approved, legitimate viewing source (KinoLand never hosts video). */
export function ProviderLinkButton({ movieId, title, provider, url, region }: { movieId: number; title: string; provider: string; url: string; region: string | null }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => sendEvent({ type: "playback_started", path: location.pathname, movieId, props: { source: "provider", title, provider } })}
      className={buttonClass("secondary", "sm")}
    >
      {provider}
      {region ? <span className="text-[0.65rem] text-subtle">{region}</span> : null}
      <ExternalIcon size={13} />
    </a>
  );
}
