import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const KEY = "pattern-explorer-v1";

type ProgressState = { done: string[]; seen: string[] };

function loadProgress(): ProgressState {
  if (typeof window === "undefined") return { done: [], seen: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { done: [], seen: [] };
    const parsed = JSON.parse(raw) as { done?: unknown; seen?: unknown };
    return {
      done: Array.isArray(parsed.done) ? parsed.done.filter((id): id is string => typeof id === "string") : [],
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return { done: [], seen: [] };
  }
}

export function useProgress() {
  const [done, setDone] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const loaded = loadProgress();
    setDone(loaded.done);
    setSeen(loaded.seen);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ done, seen }));
    } catch {
      /* private mode / quota — progress stays in memory for the session */
    }
  }, [ready, done, seen]);

  const markSeen = useCallback((id: string) => {
    setSeen((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const markDone = useCallback((id: string) => {
    setDone((current) => (current.includes(id) ? current : [...current, id]));
    setSeen((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const reset = useCallback(() => {
    setDone([]);
    setSeen([]);
  }, []);

  return { done, seen, ready, markSeen, markDone, reset };
}
