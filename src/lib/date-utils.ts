import { useEffect, useState } from "react";

/** Returns the local calendar date as YYYY-MM-DD without converting through UTC. */
export function formatLocalDateInput(date: Date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Validates an ISO-shaped civil date without interpreting it as a UTC timestamp. */
export function isValidCivilDate(value: string): boolean {
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

/** Compares civil dates lexically after validation; no UTC midnight conversion occurs. */
export function isCivilDateInFuture(value: string, now: Date = new Date()): boolean {
  return isValidCivilDate(value) && value > formatLocalDateInput(now);
}

/**
 * Tracks the device's local calendar day, refreshing at local midnight and when
 * the tab returns to the foreground. This is for civil-date UI, not server events.
 */
export function useLocalToday(): Date {
  const [today, setToday] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleNextMidnight() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeoutId = window.setTimeout(refreshToday, Math.max(250, nextMidnight.getTime() - now.getTime() + 50));
    }

    function refreshToday() {
      const now = new Date();
      setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      scheduleNextMidnight();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") refreshToday();
    }

    scheduleNextMidnight();
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return today;
}
