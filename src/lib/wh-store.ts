import { useCallback, useEffect, useRef, useState } from "react";
import {
  authMe,
  loadAll,
  putCollection,
  setWeddingDate as setWeddingDateFn,
  syncCheck,
  authLogout,
} from "./wh.functions";
import type { CollectionName, WeddingData, WeddingSession } from "./wh-types";

const TOKEN_KEY = "wh_token";
const ROOM_KEY = "wh_roomId";
const CODE_KEY = "wh_inviteCode";

export const POLL_INTERVAL_MS = 5000;

export function saveSession(s: WeddingSession) {
  localStorage.setItem(TOKEN_KEY, s.token);
  localStorage.setItem(ROOM_KEY, s.roomId);
  localStorage.setItem(CODE_KEY, s.inviteCode);
}

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROOM_KEY);
  localStorage.removeItem(CODE_KEY);
}

const EMPTY: WeddingData = {
  weddingDate: "",
  inbox: [],
  budget: [],
  tasks: [],
  vendors: [],
  checklist: [],
  links: [],
  updatedAt: "",
};

export interface Store {
  session: WeddingSession | null;
  data: WeddingData;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  setSession: (s: WeddingSession | null) => void;
  refresh: () => Promise<void>;
  update: <K extends CollectionName>(
    col: K,
    updater: (prev: WeddingData[K]) => WeddingData[K],
  ) => Promise<void>;
  setWeddingDate: (d: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useWeddingStore(): Store {
  const [session, setSessionState] = useState<WeddingSession | null>(null);
  const [data, setData] = useState<WeddingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSyncRef = useRef<string>("");

  // Init: check existing token
  useEffect(() => {
    const token = readToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await authMe({ data: { token } });
        setSessionState(s);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    const token = readToken();
    if (!token) return;
    setSyncing(true);
    try {
      const all = await loadAll({ data: { token } });
      setData(all);
      lastSyncRef.current = all.updatedAt;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  // Load data when session appears
  useEffect(() => {
    if (session) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    } else {
      setData(EMPTY);
    }
  }, [session, refresh]);

  // Polling
  useEffect(() => {
    if (!session) return;
    const token = session.token;
    const id = setInterval(async () => {
      try {
        const { updatedAt } = await syncCheck({ data: { token } });
        if (updatedAt && updatedAt !== lastSyncRef.current) {
          await refresh();
        }
      } catch {
        /* silent */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session, refresh]);

  const setSession = (s: WeddingSession | null) => {
    if (s) saveSession(s);
    else clearSession();
    setSessionState(s);
  };

  const update = useCallback(
    async <K extends CollectionName>(col: K, updater: (prev: WeddingData[K]) => WeddingData[K]) => {
      const token = readToken();
      if (!token) return;
      let next: WeddingData[K] = EMPTY[col];
      setData((prev) => {
        next = updater(prev[col]);
        return { ...prev, [col]: next };
      });
      try {
        await putCollection({ data: { token, collection: col, items: next as unknown[] } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
        // self-heal on next poll
      }
    },
    [],
  );

  const setWeddingDate = useCallback(
    async (d: string) => {
      const token = readToken();
      if (!token || !session) return;
      setData((p) => ({ ...p, weddingDate: d }));
      setSessionState({ ...session, weddingDate: d });
      try {
        await setWeddingDateFn({ data: { token, weddingDate: d } });
      } catch {
        /* silent */
      }
    },
    [session],
  );

  const logout = useCallback(async () => {
    const token = readToken();
    if (token) {
      try {
        await authLogout({ data: { token } });
      } catch {
        /* ignore */
      }
    }
    clearSession();
    setSessionState(null);
  }, []);

  return {
    session,
    data,
    loading,
    syncing,
    error,
    setSession,
    refresh,
    update,
    setWeddingDate,
    logout,
  };
}

// ---- formatting ----
export function formatINR(n: number): string {
  if (!isFinite(n)) return "₹0";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + "h ago";
  return Math.floor(diff / 86_400_000) + "d ago";
}

export function formatWeddingDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysUntil(iso: string): number {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((d - now) / 86_400_000);
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function detectType(text: string): "general" | "budget" | "media" {
  if (/https?:\/\//i.test(text) || /instagram\.com|pin(?:terest)?\./i.test(text)) return "media";
  if (/₹|\brs\.?\b|\bk\b|\bcost\b|\bbudget\b|\blakh\b|\bcrore\b/i.test(text) && /\d/.test(text))
    return "budget";
  return "general";
}

export function extractNumber(text: string): number {
  const cleaned = text.replace(/,/g, "");
  const m = cleaned.match(/(\d+(?:\.\d+)?)\s*(k|lakh|cr|crore)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  if (unit === "k") return n * 1_000;
  if (unit === "lakh") return n * 100_000;
  if (unit === "cr" || unit === "crore") return n * 10_000_000;
  return n;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}
