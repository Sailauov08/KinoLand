"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toggleListAction } from "@/app/actions/lists";
import { useI18n } from "./i18n-provider";

type ListName = "watchlist" | "favorite";

interface ListState {
  signedIn: boolean;
  has: (list: ListName, id: number) => boolean;
  isPending: (list: ListName, id: number) => boolean;
  toggle: (list: ListName, id: number) => void;
}

const Ctx = createContext<ListState | null>(null);

/**
 * Client-side mirror of the signed-in user's watchlist/favourite ids. Toggles are optimistic and
 * reconciled with the server action result (reverted + announced on failure).
 */
export function ListStateProvider({
  signedIn,
  watchlist,
  favorite,
  children,
}: {
  signedIn: boolean;
  watchlist: number[];
  favorite: number[];
  children: ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [sets, setSets] = useState(() => ({ watchlist: new Set(watchlist), favorite: new Set(favorite) }));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync when the server sends fresh ids (e.g. after navigation or sign-in).
  const serverKey = `${signedIn}|${watchlist.join(",")}|${favorite.join(",")}`;
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setSets({ watchlist: new Set(watchlist), favorite: new Set(favorite) });
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const announce = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  const apply = (list: ListName, id: number, value: boolean) =>
    setSets((prev) => {
      const next = new Set(prev[list]);
      if (value) next.add(id);
      else next.delete(id);
      return { ...prev, [list]: next };
    });

  const toggle = useCallback(
    (list: ListName, id: number) => {
      if (!signedIn) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const key = `${list}:${id}`;
      const desired = !sets[list].has(id);
      apply(list, id, desired);
      setPending((p) => new Set(p).add(key));
      startTransition(async () => {
        try {
          const res = await toggleListAction(id, list, desired);
          if (!res.ok) {
            apply(list, id, !desired);
            if (res.reason === "auth") router.push("/login");
            else announce(t("list.error"));
          } else {
            apply(list, id, res.inList);
            router.refresh();
          }
        } catch {
          apply(list, id, !desired);
          announce(t("list.error"));
        } finally {
          setPending((p) => {
            const n = new Set(p);
            n.delete(key);
            return n;
          });
        }
      });
    },
    [signedIn, sets, router, announce, t],
  );

  const value = useMemo<ListState>(
    () => ({
      signedIn,
      has: (list, id) => sets[list].has(id),
      isPending: (list, id) => pending.has(`${list}:${id}`),
      toggle,
    }),
    [signedIn, sets, pending, toggle],
  );

  return (
    <Ctx value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
        {message ? (
          <p className="animate-fade-up pointer-events-auto rounded-full bg-surface-3 px-5 py-3 text-sm text-fg shadow-2xl ring-1 ring-line-strong">
            {message}
          </p>
        ) : null}
      </div>
    </Ctx>
  );
}

export function useListState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useListState must be used within ListStateProvider");
  return ctx;
}
