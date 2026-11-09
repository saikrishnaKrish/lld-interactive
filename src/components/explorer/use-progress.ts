import { useCallback, useEffect, useState } from "react";

const KEY = "pattern-explorer-v1";

export function useProgress() {
  const [done, setDone] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { done?: unknown; seen?: unknown };
        if (Array.isArray(parsed.done)) {
          setDone(parsed.done.filter((id) => typeof id === "string"));
        }
        if (Array.isArray(parsed.seen)) {
          setSeen(parsed.seen.filter((id) => typeof id === "string"));
        }
      }
    } catch {
      /* ignore broken local progress */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify({ done, seen }));
  }, [ready, done, seen]);

  const markSeen = useCallback((id: string) => {
    setSeen((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const markDone = useCallback((id: string) => {
    setDone((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const reset = useCallback(() => {
    setDone([]);
    setSeen([]);
  }, []);

  return { done, seen, markSeen, markDone, reset };
}
